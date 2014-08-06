var hyperprox = require('hyperprox')

module.exports = function(selectedfn, addressfn){
	var proxy = hyperprox(addressfn)
	var proxyhandler = proxy.handler()
	return function(handler){
		return function(req, res){
			if(req.method=='GET'){
				return handler(req, res)
			}
			else{
				var selected = selectedfn()

				if(selected){
					return handler(req, res)
				}
				else{
					proxyhandler(req, res)
				}
			}
		}
	}

}