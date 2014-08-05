var http = require("http")
var locked = require("locked")
var masterProxy = require('./')

var serverid = process.env.NODEID
var serveraddress = '127.0.0.1:' + process.env.NODEPORT

// create a locker passing etcd connection details
var locker = locked('127.0.0.1:4001,127.0.0.1:4002')

// create a lock with a value that is the address for our HTTP server
var node = locker({
    id:serverid,
    path:'/myexampleservice',
    value:serveraddress,
    ttl:10
})

var proxy = masterProxy(function(){
    return node.isSelected()
},function(){
    return node.value()
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