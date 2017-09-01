var express = require('express');
var http = require("./http");

var app = express();

function send(res,ret){
	var str = JSON.stringify(ret);
	console.log("send: " + str);
	res.send(str)
}

var config = null;

exports.start = function(){
	let port = 8080;
	app.listen(port);
	console.log("account server is listening on " + port);
}

//设置跨域访问
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

var appInfo = {
	Android:{
		appid:"wxbbbdfeb6dc167cc8",					//改成自己的id
		secret:"8fb2da1722fbd92779bce6a5053dc534",	//改成自己的secret
	},
	iOS:{	
		appid:"wx",		//同上
		secret:"wx",	
	}
};

function get_access_token(code,os,callback){
	var info = appInfo[os];
	if(info == null){
		callback(false,null);
	}
	var data = {
		appid:info.appid,
		secret:info.secret,
		code:code,
		grant_type:"authorization_code"
	};

	http.get2("https://api.weixin.qq.com/sns/oauth2/access_token",data,callback,true);
}

function get_state_info(access_token,openid,callback){
	var data = {
		access_token:access_token,
		openid:openid
	};

	http.get2("https://api.weixin.qq.com/sns/userinfo",data,callback,true);
}

///刷新token
///正确返回：
///    access_token               // 接口调用凭证
///    expires_in                 // access_token接口调用凭证超时时间，单位（秒）
///    refresh_token              // 用户刷新access_token
///    openid                     // 授权用户唯一标识
///    scope                      // 用户授权的作用域，使用逗号（,）分隔
///错误返回：{"errcode":40030,"errmsg":"invalid refresh_token"}
function refresh_token(refresh_token,os,callback){
	var info = appInfo[os];
	if(info == null){
		callback(false,null);
	}

	var data = {
		appid:info.appid,
		grant_type:"refresh_token",
		refresh_token:refresh_token
	};

	http.get2("https://api.weixin.qq.com/sns/oauth2/refresh_token",data,callback,true);
}

app.get('/wechat_auth',function(req,res){
	var code = req.query.code;
	var os = req.query.os;
	if(code == null || code == "" || os == null || os == ""){
		return;
	}
	console.log("wechat_auth code = " + code + " os = " + os);
	get_access_token(code,os,function(suc,data){
		if(suc){
			console.log("wechat_auth get_access_token success ");

			var access_token = data.access_token;
			var openid = data.openid;
			var refresh_token = data.refresh_token;
			get_state_info(access_token,openid,function(suc2,data2){
				if(suc2){
					console.log("wechat_auth get_state_info success ");

					var openid = data2.openid;
					var ret = {};
					ret.nickname = data2.nickname;
					ret.sex = data2.sex;
					ret.headimgurl = data2.headimgurl;
					ret.account = "wx_" + openid;
					ret.refresh_token = refresh_token;

					send(res,ret);	
				}
			});
		}
		else{
			send(res,{errcode:-1,errmsg:"unkown err."});
		}
	});
});

//通过refresh_token获取access_token
app.get('/wechat_refresh',function(req,res){
	var token = req.query.token;
	var os = req.query.os;
	if(token == null || token == "" || os == null || os == ""){
		return;
	}
	console.log("wechat_refresh token = " + token + " os = " + os);
	refresh_token(token,os,function(suc,data){
		if(suc){
			if(data.errcode && data.errmsg){			//刷新失败，可能token失效了
				send(res,{errcode:data.errcode,errmsg:data.errmsg});
				return;
			}

			var access_token = data.access_token;
			var openid = data.openid;
			var refresh_token = data.refresh_token;
			get_state_info(access_token,openid,function(suc2,data2){
				if(suc2){
					var openid = data2.openid;
					var ret = {};
					ret.nickname = data2.nickname;
					ret.sex = data2.sex;
					ret.headimgurl = data2.headimgurl;
					ret.account = "wx_" + openid;
					ret.refresh_token = refresh_token;

					send(res,ret);	
				}
			});
		}
		else{
			send(res,{errcode:-1,errmsg:"unkown err."});
		}
	});
});