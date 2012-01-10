var url = require('url');
var util = require("util");
var cutil = require("./cutil");
var _event = new require("events").EventEmitter;
var nTime = 1000; 
var nTimeId  = null;

var Convert = function(settings){	
	var _self = this;
	var _logger = null;
	
	var cmysql = require('./cmysql').createCMysql(settings);
	
	_self.setLogger=function(logger){
		_logger = logger;
	};
	
	//��������֪ͨ
	_self.on('has-task', function(task){		
	  	_logger.info([task.queue,task.uri ].join("\t"));
	  	var u = url.parse(task.uri);
	  	if(u.hash){
	  		var _id = u.hash.substring(1); 
	  		_self.emit('article-load',task,_id);
	  	}else{
	  		_self.emit('task-finished',task);	  
	  	}	  	
	});
	
	//΢���������ݷ���
	_self.on('micro-analyse',function(micro){
		//micro.title,micro.code,micro.content,micro.task;
			var microContent = cutil.checkContent(micro.title,micro.content);
			if(microContent!=""){
				_self.emit('micro-save',{task:micro.task,code:micro.code,content:microContent+micro.url});
			}else{
				_self.emit('task-finished',task);	
			}
	});
	
	//�¼�֪ͨ�����ݿ��м���ָ�������ݽ��з���
	_self.on('article-load', function(task,articleId){
		cmysql.loadArticleContent(articleId,function(err,results){
			if (err) {
	      _logger.info(["Mysql-Err",err]);
	      _self.emit('task-error',task);
	    } else {
	      	_logger.info([articleId,results['stock_code'],results['title']]);
	      	var _rContent = results['content'];
	      	if(_rContent!=null && _rContent.length>0){
		      	_self.emit('micro-analyse',{task:task,url:results['url'],title:results['title'],code:results['stock_code'],content:_rContent});
	      	}else{
	      		_logger.info(["Record-Err","Empty Content",aticleId]);
	      		_self.emit('task-finished',task);	  
	      	}
	    }
		});
	});

	//���������������תΪ΢�����ݽ������ݿⱣ��
	_self.on('micro-save',function(micro){
		cmysql.saveMicroContent(micro,function(err,_id){
			if(err){
				_logger.info(["Mysql-Err",err]);
	      _self.emit('task-error',micro.task);
			}else{
				_logger.info(["Add-Micro",micro.code,_id]);
				if(_id>0){
					_self.emit('micro-push',_id);
					_self.emit('task-finished',micro.task);
				}else{
					_self.emit('task-error',micro.task);
				}
			}
		});
	});
	
	//������ʱɨ������
	this.start=function(flag){
		if(flag){
			console.log(["NO TASK",new Date,nTime*10]);
			if(nTimeId!=null){
				clearTimeout(nTimeId);
			}
			nTimeId = setTimeout(this.start,nTime*10);
		}else{
			_self.emit('task-load');
		}	
	};

};
util.inherits(Convert, _event);

exports.createConvert =function(settings){
	return new Convert(settings);
}