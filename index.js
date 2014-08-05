var locked = require('locked')
var hyperquest = require('hyperquest')

module.exports = function(selectedfn, addressfn){

	return function(handler){
		return function(req, res){
			if(req.method=='GET'){
				return handler(req, res)
			}
			else{
				selectedfn(function(err, selected){
					if(err){
						res.statusCode = 500
						res.end(err)
						return
					}
					if(selectedfn()){
						return handler(req, res)
					}
					else{
						addressfn(function(err, address){
							if(!address && !err){
								err = 'no address found'
							}
							if(err){
								res.statusCode = 500
								res.end(err)
								return
							}
							var proxy = hyperquest('http://' + address + req.url, {
								method:req.method,
								headers:req.headers
							})
							if(method=='GET'||method=='DELETE'){
								proxy.pipe(res)
							}
							else{
								req.pipe(proxy).pipe(res)
							}
							proxy.on('error', function(err){
								res.statusCode = 500
								res.end(err)
							})
						})
					}
				})
			}
		}
	}

}