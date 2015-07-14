# AWS
console.log('Loading event');
var aws = require('aws-sdk');
var parseString = require('xml2js').parseString;
var request = require('request');

var pagerDutyURL="https://events.pagerduty.com/generic/2010-04-15/create_event.json";
var pagerDutyKey="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

var ddb = new aws.DynamoDB({params: {TableName: 'LogstashOutputDev'}});

var stringConverter=function(sourceObj,defaultStr) {
  if (sourceObj && sourceObj.length>0  && !!sourceObj[0]) {
    return sourceObj[0];
  } else {
    return defaultStr;
  }
}

exports.handler = function(event, context) {


  var AppName="n/a";
  var CompName="n/a";
  var MachineName="n/a";
  var Severity="n/a";

  var AppErrorCode="-101";
  var AppErrorDescr="n/a";
  var AppErrorStr="n/a";

  var SysErrorCode="n/a";
  var SysErrorDescr="n/a";
  var SysErrorStr="n/a";

  var SnsMessageId = event.Records[0].Sns.MessageId;
  var SnsPublishTime = event.Records[0].Sns.Timestamp;
  var SnsTopicArn = event.Records[0].Sns.TopicArn;
  var LambdaReceiveTime = new Date().toString();

  parseSnsMessage(function() {
    context.done(null,'');
  });

  function parseSnsMessage(callback) {
    console.log("Parsing SNS message...");

    var MessageObj = JSON.parse(event.Records[0].Sns.Message);
    if (MessageObj && MessageObj.message) {
      var xml=MessageObj.message;

// parse xml from message
      parseString(xml, function (err, result) {
        if (!err) {
          errMsg=result.ErrorMessage;

          if (errMsg) {
            AppName=stringConverter(errMsg.ApplicationName,"n/a");
            CompName=stringConverter(errMsg.ComponentName,"n/a");
            MachineName=stringConverter(errMsg.MachineName,"n/a");
// Should check for valid Severity values
            Severity=stringConverter(errMsg.Severity,"n/a");

            AppErrorCode=stringConverter(errMsg.ApplicationErrorCode,"-101");
            AppErrorDescr=stringConverter(errMsg.ApplicationErrorDescription,"n/a");
            AppErrorStr=stringConverter(errMsg.ApplicationErrorString,"n/a");

            SysErrorCode=stringConverter(errMsg.SystemErrorCode,"n/a");
            SysErrorDescr=stringConverter(errMsg.SystemErrorDescription,"n/a");
            SysErrorStr=stringConverter(errMsg.SystemErrorString,"n/a");
          } else {
            Severity="Error";
            AppErrorDescr="XML in message did not have ErrorMessage element";
            AppErrorStr=xml;
          }
        } else {
          Severity="Error";
          AppErrorDescr="Could not parse XML in message";
          AppErrorStr=xml;
        }
        insertIntoDatabase(callback);
      });
    } else {
      Severity="Error";
      AppErrorDescr="SNS message could not be parsed or did not have message element";
      AppErrorStr=event.Records[0].Sns.Message;
      insertIntoDatabase(callback);
    }
  }

  function insertIntoDatabase(callback) {
    console.log("Inserting into database...");
    var itemParams = {
        TableName: "LogstashOutputDev",
        Item: {
          SnsTopicArn: {S: SnsTopicArn},
          SnsPublishTime: {S: SnsPublishTime},
          SnsMessageId: {S: SnsMessageId},
          LambdaReceiveTime: {S: LambdaReceiveTime},
          MachineName: {S: MachineName},
          ApplicationName: {S: AppName},
          ComponentName: {S: CompName},
          Severity: {S: Severity},
          ApplicationErrorCode: {S: AppErrorCode},
          ApplicationErrorDescription: {S: AppErrorDescr},
          ApplicationErrorString: {S: AppErrorStr},
          SystemErrorCode: {S: SysErrorCode},
          SystemErrorDescription: {S: SysErrorDescr},
          SystemErrorString: {S: SysErrorStr},
        }
    }
//    console.log("itemParams: " + JSON.stringify(itemParams));
    ddb.putItem(itemParams, function() {
        sendPagerdutyAlert(callback);
    });
  }


  function sendPagerdutyAlert(callback) {
    console.log("Sending pagerduty alert if necessary...");
    if (Severity.toUpperCase() == "ERROR") {
      var descr = "DFC Alert (DEV)";
      var details = "Error: " + AppErrorDescr;
      var options = {
        uri: pagerDutyURL,
        method: 'POST',
        json: {"event_type": "trigger", "service_key": pagerDutyKey,
           "description": descr, "details": details}
      };
      request(options, function(error, response, body){
          callback();
      });
    } else {
      callback()
    }
  }

};



var lambda=require("./index.js")

//var severity = "Warning";
var severity = "Error";

var msgbody="{\"message\":\""
   + "<ErrorMessage>"
   + "</ErrorMessage>"
   + "\"}";


event={
  Records:[
    {
      Sns: {
        MessageId: "asdfasfd",
        Timestamp: "123123",
        TopicArn: "asfdasd",
        Message: msgbody
      }
    }
  ]
};

ctx={done:function(a,b){}};

lambda.handler(event,ctx);


 
