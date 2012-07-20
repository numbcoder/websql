#websql.js - a simple websql wrapper

a simple way to use websql storage in mordern browers

##Getting Started

###clone this repo

    git clone git@github.com:Numbcoder/websql.git
    
###how to use
connect the database

    webSql.connect('Demo', 0.1, 'A websql demo', 200000);
    
params:

  * database name
  * version
  * description
  * max size
    
define the model and table

    var User =  webSql.define('user', {
      id   : 'INTEGER PRIMARY KEY',
      name : 'TEXT',
      age  : 'INTEGER',
      other: 'JSON'
    });


`JSON` type support

model method

    find(keys, conditions, success, error);

   eg:
   
    User.find('id, name', {where: 'age > 20', limit: 3}, function() {
      // do callback
    });

    User.find('count(*)', {}, function(){}) //count

    all(success, error); // find all
    
   eg：
   
    User.all(function(){
      // do callback
    });


    insert(obj, success, error); //insert
   
   eg：
    
    User.insert({id: 2, name: 'abc'}, function() {
      // success callback
    }, function() {
      // error callback
    });
  
  
    update(obj, success, error);
   
   eg： 
    
    User.update({id:2, name: 'cccc'});
  
    destroy(conditions, success, error); //destroy
    
   eg:
    
     // 2 ways for destroy
     User.destroy(1); //from id
     User.destroy({where: "name='abc'"}); // from conditions

  
    drop(); //drop table
    
   eg:
   
    User.drop();


##Contributing!
Fork this project on [GitHub](https://github.com/Numbcoder/websql), add your improvement, push it to a branch in your fork named for the topic, send a pull request.

You can also file bugs or feature requests under the [issues](https://github.com/Numbcoder/websql/issues) page on GitHub.


##License
Freely distributed under the MIT license