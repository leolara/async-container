# BlueHub - Asynchronous Dependency Injection for Javascript

> is a Javascript simple and powerful service container that handle asynchronous (and synchronous) service creation and dependency injection

> Just pass BlueHub a function that creates your service asynchronously and tell BlueHub on which other services it depends, BlueHub will automatically handle the dependency injection

> It is like AngularJS dependency injection but lighter, **asynchronous** and works on the server!

## Contents
 + [Highlights](#highlights)
 + [Documentation](#doc)
 + [Plugins](#plugins)
 + [License](#license)

## <a name="highlights"></a>Highlights

 + Async/sync services creation using node.js callbacks
 + Automatic dependencies resolution and (async) injection 
 + Works on Node.Js and the browser
 + Extendable by plugins (some plugins included)
 + Lightweight, only dependency is Q promises
 + Lazy creation of services
 + Solves some cases of callback hell


### Basic example

    // Create container
    var container = require('bluehub').create();
    
    // Add service for Redis DB
    container.add('redis_client', function (callback) {
      var client = require("redis").createClient();
      
      // Does not creates the service until we have authenticated
      client.auth('SUPERSECRET', function () {
         // Creates the service by calling the callback
         callback(null, client);
      });
    });
    
This way we have created our first async service, in this simple case it does not depend on any other service. Let us see how to use it:

    container.get('redis_client', function (err, redis) {
      if (err) throw err;
      console.log('Redis client created');
      console.log(client);
    });

But the interesting magic of BlueHub comes when you have more than one service and there are dependencies among them. For example let us assume we have a mongoDB service as well, then we have a class that have all our business logic and knows what is in Redis and what is in MongoDB.

    // Add service for MongoDB
    container.add('mongodb_client', function (callback) {
      // Code to connect and authenticate with MongoDB
      
      // … some pseudo-code follows
      
      obj.method(function (err, data) {
        if (err) {
           callback(err);
        }
        callback(null, data.connection);
      });
    });

    // Business Logic service with dependencies
    container.add('acme_business_logic', {
      depends: ['redis_client', 'mongodb_client']
      factory: function (callback, redis, mongodb) {
        callback(null, new AcmeBusinessLogic(redis, mongodb));
      }
    });
    
    container.get('acme_business_logic', function (err, bl) {
      if (err) throw err;
      console.log('Business Logic created');
      console.log(bl);
    });

The most important point here to see is how the dependencies are declared and automatically solved in BlueHub. At any the moment `acme_business_logic` service is requested (using `container.get`) BlueHub will see the dependencies of it, call the factories of the dependencies, wait for their asynchronous creation, and only then call the factory of `acme_business_logic` with the already created dependencies.

Note that the service factories are only called once, even if they are requested several times, always the same instance will be returned.

## <a name="doc"></a>Documentation

The BlueHub API is very simple, it has to main methods: `add` and `get`. But before entering in material

### What is a service

A service can be any javascript value that is handle by BlueHub. They usually are objects but can be any value.

A BlueHub service have associated an `id` and `service definition`.

Most services will need to be created asynchronously depend on other services for their creation. Here is where BlueHub is very helpful. BlueHub additionally will make sure the service is created only once and only if it is needed, even if the serviced is depended by more than one service or requested more than one time.

### What is a service definition
A service definition is an object describing how to create the service, and other meta-information like its dependencies.

The default service definition has a mandatory property `factory` and a option property `depends`. But BlueHub plugins can implement other completely different models.

    var myservice_definition = {
      depends: ['other_service'],
      factory: function (callback, other_service) {
         // service is created here and passed to callback
         // ...
      }
    }


### Anatomy of a factory function

The factory function is the most important field in the service definition. It should know how to create the service, using its dependencies.

Let us see a simple one for a service that has no dependencies, and which creation is synchronous.

    function (callback) {
    	var my_service = new MyContructor();
    	callback(null, my_service);
    }

As we see the first parameter of the factory is always a callback to which we will pass the service once it has been created. In this case the service was created synchronously, so the callback was not very useful.

Let us see how we would do it in a more complex and asynchronous setting. For example the factory for a service that is a MongoDB DB handle:

    function (callback) {
		var MongoClient = require('mongodb').MongoClient
          , Server = require('mongodb').Server;

        var mongoClient = new MongoClient(new Server('localhost', 27017));
        mongoClient.open(function(err, mongoClient) {
          if (err) {
            return callback(err);
          }
          callback(null, mongoClient.db("mydb"));
    	});
    }

Here we open the connection to MongoDB asynchronously, and pass the created DB handle to BlueHub.

A service can have dependencies on other services, if that is the case, the factory method will have additional parameters to receive the services.

For example, we should split our previous mongodb example in two services, one for the client connection and another for the database handler:

    // MongoDB client connection factory
    function (callback) {
		var MongoClient = require('mongodb').MongoClient
          , Server = require('mongodb').Server;

        var mongoClient = new MongoClient(new Server('localhost', 27017));
        mongoClient.open(function(err, mongoClient) {
          if (err) {
            return callback(err);
          }
          // create service once the connection is open
          callback(null, mongoClient);
    	});
    }
    
    // MongoDB database handle
    function (callback, mongoClient) {
        callback(null, mongoClient.db("mydb"));
    }

We have here two services factories, the second one have an additional parameter where BlueHub will inject the dependency. We will see more details on this below.

### Defining dependencies

The dependencies are defined as an array of services ids, in the field `depends` of the service definition. It is optional to have dependencies.

If a service have dependencies BlueHub will create the dependencies before calling the service factory and pass the dependencies as parameters of the factory, in the same order than in `depends` and after `callback` parameter.

Now we can see in the MongoDB example how would be the service definitions:

    var mongodb_client_def = {
      // MongoDB client connection factory
      factory: function (callback) {
		  var MongoClient = require('mongodb').MongoClient
            , Server = require('mongodb').Server;

          var mongoClient = new MongoClient(new Server('localhost', 27017));
          mongoClient.open(function(err, mongoClient) {
            if (err) {
              return callback(err);
            }
            // create service once the connection is open
            callback(null, mongoClient);
    	  });
      }
    }
    var mongodb_db_def = {
      depends: ['mongodb_client'],
      // MongoDB database handle
      factory: function (callback, mongoClient) {
          callback(null, mongoClient.db("mydb"));
      }
    }

Note that here we are assuming that the service id of the client is `mongodb_client`, below we will see how we set the service id.

Based on this definitions BlueHub is able to create and inject these services.

### Creating a service container

It is really simple:

    var container = require('bluehub').create();

That is it, no parameters required.

### Adding services to the container

Now we have all the pieces in place to start feeding our container. Use `add` method to add services to the container.

    container.add(service_id, service_definition);

Following our example with the MongoDB:


    container.add('mongodb_client', {
      // MongoDB client connection factory
      factory: function (callback) {
		  var MongoClient = require('mongodb').MongoClient
            , Server = require('mongodb').Server;

          var mongoClient = new MongoClient(new Server('localhost', 27017));
          mongoClient.open(function(err, mongoClient) {
            if (err) {
              return callback(err);
            }
            // create service once the connection is open
            callback(null, mongoClient);
    	  });
      }
    });

    container.add('mongodb_mydb', {
      depends: ['mongodb_client'],
      // MongoDB database handle
      factory: function (callback, mongoClient) {
          callback(null, mongoClient.db("mydb"));
      }
    });

Now we have given BlueHub all the information it needs to create and inject services.

There is one more thing, the simplest service is the one with no dependencies and no meta-information. Hence, we have a shortcut, if the second parameter of `add` is a function, it will be considered as the factory of the service with no other meta-information. In our example:

    container.add('mongodb_client', function (callback) {
		  var MongoClient = require('mongodb').MongoClient
            , Server = require('mongodb').Server;

          var mongoClient = new MongoClient(new Server('localhost', 27017));
          mongoClient.open(function(err, mongoClient) {
            if (err) {
              return callback(err);
            }
            // create service once the connection is open
            callback(null, mongoClient);
    	  });
    });

Note that we can do that with `mongodb_client` because it has no dependencies or other meta-information.


### Requesting services


When we add a service definition, this services is not created until the first time it is requested. A service can be requested by a dependent service or by us using the method `get`, the API for get is quite simple:

    container.get(service_id, callback)

In our previous example we could do:

    container.get('mongodb_mydb', function (err, mydb) {
         mydb.whatever();
         /// …
    });

What happens next is the interesting part of BlueHub, it will check mongodb_mydb to see if it has been request already, if so we will receive the same instance that already was created. If the services was not crated before, then will check the dependencies, and will request `mongodb_client` that as we saw it is created asynchronously. Once the dependencies have been created, will call the factory of `mongodb_mydb` passing the dependencies, and then calling the callback passed to `get`.

BlueHub uses Q promises internally, so we can use `get` using a promises API:

    container.get('mongodb_mydb').then(function (mydb) {
         mydb.whatever();
         /// …
    });

### Adding many services at once

For convenience 

## <a name="plugins"></a>Plugins

BlueHub can be extended through plugins and includes some very useful plugins.

### Parameters plugin

TODO

### Tags plugin

TODO

# <a name="license"></a>License

MIT



