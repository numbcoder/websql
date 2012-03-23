(function(window, undefined){
  var root = this;

  var DB;

  var _support =  !!(window.openDatabase);
  
  var _connect = function(shortName, version, displayName, maxSize) {
    if (!_support) return;
    
    try {
      DB = openDatabase(shortName, version, displayName, maxSize);
    } catch(e) {
      //console.log(e);
    }
  };

  // define a model
  var _defineModel = function(tableName, fields, options) {
    //options || (options = {});
    return new Model(tableName, fields, options);
  };

  // detected
  var _isObject = function(obj) {
    return obj instanceof Object;
  };

  // drop table 
  var _drop = function(tableName, success, error) {
    var sql = "DROP TABLE IF EXISTS `" + tableName + "`";
    _executeSql(null, sql, [], function(tx, result) {
      success && success(tx, result);
    }, function(tx, e) {
      error && error(tx, e);
    });
  };

  //mixin
  var _extend = function(target) {
    var objects = Array.prototype.slice.call(arguments, 1);
    objects.forEach(function(obj) {
      for (var key in obj) {
        if(obj[key] !== undefined) target[key] = obj[key];
      }
    });
    return target;
  };


  var _mapObj = function(obj, target) {
    target || (target = obj);
    var key, keys = [], vals = [], newObj = {}, v; 
    for (key in target) {
      if (hasOwnProperty.call(target, key) && obj[key] !== undefined) {
        v = newObj[key] = obj[key];
        keys.push(key);

        if (target[key] === 'JSON') v = JSON.stringify(v);
        vals.push(v);
      }
    }
    return {keys: keys, values: vals, obj: newObj};
  };
  
	var _executeSql = function(tx, sql, params, success, error) {
    if (_isObject(tx) && ('executeSql' in tx)) {
      tx.executeSql(sql, params, function(tx, result) {
        success && success(tx, result);
      }, function(tx, e) {
        error && error(tx, e);
      });
    } else {
      DB.transaction(function(tx) {
        _executeSql(tx, sql, params, success, error);
      });
    }
  };

  function Model(tableName, fields, options) {
    options || (options = {});
    this.tableName = tableName;
    this.fields = fields;

    var columns = [], name;
    for (name in fields) {
      columns.push("`" + name + "` " + fields[name]);
    }
    var sql = "CREATE TABLE IF NOT EXISTS `" + tableName + "` (" + columns.join(", ") + ")";

    var self = this;
    _executeSql(null, sql, [], function(tx){
      var index = options.index, i, addIndexsql = '';
      if (index && _isObject(index)) {
        for (i in index) {
          addIndexsql =  "CREATE INDEX IF NOT EXISTS " + i + " ON `" + self.tableName + "` (" + index[i] + ")"; 
          _executeSql(tx, addIndexsql, []);
        }
      }
    });
  };

  _extend(Model.prototype, {

    filter: function(obj){
      var name, fields = this.fields, newObj = {};
      for (name in fields) {
        if(hasOwnProperty.call(fields, name) && obj[name] !== undefined) newObj[name] = obj[name];
      }

      return newObj;
    },

    _dealResult: function(rows) {
      var result = [], fields = this.fields, item, key, obj;

      if (rows.length > 0) {
        for (var i = 0, l = rows.length; i < l; i++) {
          item = rows.item(i);
          obj = {};
          for (key in item) {
            obj[key] = fields[key] === 'JSON' ? JSON.parse(item[key] || '""') : item[key];
          }
          result.push(obj);
        }
      }
      return result;
    },


    find: function(keys, conditions, success, error, tx){
      var self = this, k, con = [];
      for (k in conditions) {
        con.push(k.toUpperCase() + ' ' + conditions[k]);
      }
      if (keys === '') keys = '*';

      var sql = "SELECT " + keys + " FROM `" + this.tableName + "` " + con.join(" ");
      //console.log(sql);
      _executeSql(tx, sql, [], function(tx, result) {
        success && success(tx, self._dealResult(result.rows));
      }, function(tx, e) {
        error && error(tx, e);
      });
    },

    all: function(success, error, tx) {
      this.find('*', {}, success, error, tx);
    },

    insert: function(obj, success, error, tx) {
      var data = _mapObj(obj, this.fields);
      var val = []; 
      var keys = data.keys.map(function(k) {
        val.push('?');
        return "`" + k +"`"; 
      });
      var sql = "INSERT INTO `" + this.tableName + "` (" + keys.join(", ") + ") VALUES (" + val.join(", ") + ")";
      _executeSql(tx, sql, data.values, function(tx, result) {
        success && success(tx, result);
      }, function(tx, e) {
        error && error(tx, e);
      });
    },

    insertMany: function(ary, success, error, tx, i){
      if (i === undefined) i = 0;
      if (i === ary.length) {
        success && success(tx)
        return;
      }
      var self = this;
      this.insert(ary[i], function(tx) {
        self.insertMany(ary, success, error, tx, i + 1);
      }, function(tx, e) {
        error && error(tx, e);
      }, tx);
    },

    update: function(obj, success, error, tx) {
      var data = _mapObj(obj, this.fields);
      set = [];
      data.keys.forEach(function(k, i) {
        set.push("`" + k + "` = ?");
      });
      var sql = "UPDATE `" + this.tableName + "` SET " + set.join(", ") + " WHERE id = '" + obj.id + "'";

      _executeSql(tx, sql, data.values, function(tx, result) {
        success && success(tx, result);
      }, function(tx, e) {
        error && error(tx, e);
      });
    },

    upsert: function(obj, success, error, tx) {
      var self = this;
      var sql = "SELECT id FROM `" + this.tableName + "` WHERE id = ?"; 
      _executeSql(tx, sql, [obj.id], function(tx, result) {
        if (result.rows.length > 0) {
          self.update(obj, success, error, tx);
        } else {
          self.insert(obj ,success, error, tx);
        }
      }, function(tx, e) {
        error && error(tx, e);
      });
    },

    //删除表 
    drop: function(success, error) {
      _drop(this.tableName, success, error);
    },
  
    /*
     * 删除记录
     *
     * 通过id    destroy(1)
     * 查询条件  destroy({where: "name='a'"})
    */
    destroy: function(conditions, success, error, tx) {
      var self = this, k, con = [];
      if (typeof conditions === 'object') {
        for (k in conditions) {
          con.push(k.toUpperCase() + ' ' + conditions[k]);
        }
      } else {
        con.push('WHERE id=' + conditions);
      }

      var sql = "DELETE FROM `" + this.tableName + "` "+ con.join(' ');
      _executeSql(tx, sql, [], function(tx, result) {
        success && success(tx, result);
      }, function(tx, e) {
        error && error(tx, e);
      });
    },

    clear: function(success, error, tx) {
      var sql = "DELETE FROM `" + this.tableName + "` ";
      _executeSql(tx, sql, [], function(tx, result) {
        success && success(tx, result);
      }, function(tx, e) {
        error && error(tx, e);
      });
    }

  });

  root.webSql = {
    support: _support,
    connect: _connect,
    define: _defineModel,
    drop: _drop
  };

})(window);


