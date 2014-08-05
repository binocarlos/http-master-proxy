http-master-proxy
-----------------

proxy mutable HTTP traffic to an elected master

useful if you have a HTTP api where writes must be sent to an elected master but reads can be served from any node in the cluster

## install

```
$ npm install http-master-proxy
```

## usage
Create a [locked](https://github.com/binocarlos/locked) node so we have a consensus on the leader

Then make a function which will proxy POST,PUT and DELETE requests onto the elected master

```js
var http = require("http")
var locked = require("locked")
var masterProxy = require('http-master-proxy')

var serverid = process.env.NODEID
var serveraddress = '127.0.0.1:' + process.env.NODEPORT

// create a locker passing etcd connection details
var locker = locked('127.0.0.1:4001,127.0.0.1:4002')

// create a lock with a value that is the address for our HTTP server
var node = locker({
	id:serverid,
	path:'/myservice',
	value:serveraddress,
	ttl:10
})

var proxy = masterProxy(function(next){
	next(null, node.isSelected())
},function(next){
	next(null, node.value())
})

var server = http.createServer(proxy(function(req, res){
	
	if(req.url=='/api/v1/leader'){
		res.end(node.id() + "\n")
		return
	}

	if(req.method=='GET'){
		res.end('get ' + serverid + "\n")
	}
	else{
		res.end('post ' + serverid + "\n")
	}
}))

node.start()
server.listen(process.env.NODEPORT)
```

If we ran 3 copies of the server above:

```bash
$ NODEID=node1 NODEPORT=8080 node example.js
$ NODEID=node2 NODEPORT=8081 node example.js
$ NODEID=node3 NODEPORT=8082 node example.js
```

We can see that the server we hit will handle the request:

```bash
$ curl -L http://127.0.0.1:8080/api/v1/blog
get node1
$ curl -L http://127.0.0.1:8081/api/v1/blog
get node2
$ curl -L http://127.0.0.1:8082/api/v1/blog
get node3
```

Lets see which server is currently elected as master:

```bash
$ curl -L http://127.0.0.1:8082/api/v1/leader
node2
```

Then we should expect node2 to handle all POST requests across the whole cluster:

```bash
$ curl -L http://127.0.0.1:8080/api/v1/blog -XPOST -d value=bar
post node2
$ curl -L http://127.0.0.1:8081/api/v1/blog -XPOST -d value=bar
post node2
$ curl -L http://127.0.0.1:8082/api/v1/blog -XPOST -d value=bar
post node2
```

## api

### `var proxy = electedhttp(leaderfn, addressfn)`

Create a proxy function that will proxy POST, PUT and DELETE requests

`leaderfn` is a function that returns a boolean as to whether this node is the current master

`addressfn` is a function that returns the address of the current master

### `var handler = proxy(function handle(req, res){})`

Return a handler function that will be proxied to the master for POST,PUT and DELETE requests

```js
var server = http.createServer(proxy(function(req, res){
	
	// if not GET request then this will be the master
	
}))
```

## license

MIT