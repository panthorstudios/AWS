console.log('Loading event');
var aws = require('aws-sdk');
var parseString = require('xml2js').parseString;
var request = require('request');

// PagerDuty
 var pagerDutyURL="https://events.pagerduty.com/generic/2010-04-15/create_event.json";
var pagerDutyKey="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
var pagerDutyEventType = "trigger";
var pagerDutyDescription = "Alert";

// SNS output
var snsOutputARN='arn:aws:sns:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
var accessKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
var secretKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// This function will get the text from the first text node 
//   of an xml element, returning a default string if any errors 
var stringConverter=function(element,defaultStr) {
  defaultStr = defaultStr || "n/a";
  if (element && element.length>0  && !!element[0]) {
    return element[0];
  } else {
    return defaultStr;
  }
}

// DynamoDB
var dynamoTable='dynamo-table'
var ddb = new aws.DynamoDB({params: {TableName: dynamoTable}});

function insertIntoDatabase(msgDetails,callback) {
    console.log("Inserting into database...");
    var itemParams = {
        TableName: dynamoTable,
        Item: {
          SnsTopicArn:       {S: msgDetails.sns.topic_arn},
          SnsPublishTime:    {S: msgDetails.sns.publish_time},
          SnsMessageId:      {S: msgDetails.sns.message_id},
          LambdaReceiveTime: {S: msgDetails.sns.lambda_receive_time},

          MachineName:     {S: msgDetails.machine_name},
          ApplicationName: {S: msgDetails.app_name},
          ComponentName:   {S: msgDetails.component_name},
          Severity:        {S: msgDetails.severity},

          ApplicationErrorCode:        {S: msgDetails.app.error_code},
          ApplicationErrorDescription: {S: msgDetails.app.error_descr},
          ApplicationErrorString:      {S: msgDetails.app.error_string},

          SystemErrorCode:        {S: msgDetails.system.error_code},
          SystemErrorDescription: {S: msgDetails.system.error_descr},
          SystemErrorString:      {S: msgDetails.system.error_string},
        }
    }
    ddb.putItem(itemParams, function() {
        return sendPagerdutyAlert(msgDetails,callback);
    });
}

function sendSNSMessage(subject,message,callback) {
    aws.config.region = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
    var sns = new aws.SNS({ accessKeyId: accessKey, secretAccessKey:secretKey});
    sns.publish(
    {
      Subject:  subject,
      Message:  message,
      TopicArn: snsOutputARN
    },
    function(err, data) {
      if (err) {
        console.log(err.stack);
      }
      callback();
    }
    );
}

function sendPagerdutyAlert(msgDetails,callback) {
    console.log("Sending pagerduty alert if necessary...");
    if (msgDetails.severity.toUpperCase() == "ERROR") {
      var details = "Error: " + msgDetails.app.error_descr;
      var options = {
        uri: pagerDutyURL,
        method: 'POST',
        json: {"event_type": pagerDutyEventType, "service_key": pagerDutyKey,
           "description": pagerDutyDescription, "details": details}
      };
      request(options, function(error, response, body){
          if (!error && response.statusCode == 200) {
            return callback();
          }

          return sendSNSMessage('Error contacting PagerDuty',JSON.stringify(response),callback);

      });
    } else {
      return callback()
    }
}

function parseSnsMessage(event,callback) {
    console.log("Parsing SNS message...");

// All message params must have a value or 
// DB insert will fail

    var msgDetails = {
      app_name       : "n/a",
      component_name : "n/a",
      machine_name   : "n/a",
      severity       : "n/a",
      app : {
        error_code   : "n/a",
        error_descr  : "n/a",
        error_string : "n/a",
      },
      system: {
        error_code   : "n/a",
        error_descr  : "n/a",
        error_string : "n/a",
      },
      sns: {
        message_id   : event.Records[0].Sns.MessageId,
        publish_time : event.Records[0].Sns.Timestamp,
        topic_arn    : event.Records[0].Sns.TopicArn,
        lambda_receive_time : new Date().toString(),
      }
    }

    var MessageObj = JSON.parse(event.Records[0].Sns.Message);
    if (MessageObj && MessageObj.message) {
      var xml=MessageObj.message;

// parse xml from message
      parseString(xml, function (err, result) {
        if (!err) {
          errMsg=result.ErrorMessage;

          if (errMsg) {
            msgDetails.app_name=stringConverter(errMsg.ApplicationName);
            msgDetails.component_name=stringConverter(errMsg.ComponentName);
            msgDetails.machine_name=stringConverter(errMsg.MachineName);

// Should check for valid Severity values
            msgDetails.severity=stringConverter(errMsg.Severity);

            msgDetails.app.error_code=stringConverter(errMsg.ApplicationErrorCode);
            msgDetails.app.error_descr=stringConverter(errMsg.ApplicationErrorDescription);
            msgDetails.app.error_string=stringConverter(errMsg.ApplicationErrorString);

            msgDetails.system.error_code=stringConverter(errMsg.SystemErrorCode);
            msgDetails.system.error_descr=stringConverter(errMsg.SystemErrorDescription);
            msgDetails.system.error_string=stringConverter(errMsg.SystemErrorString);
          } else {
            msgDetails.severity="Error";
            msgDetails.app.error_descr="XML in message did not have ErrorMessage element";
            msgDetails.app.error_string=xml;
          }
        } else {
          msgDetails.severity="Error";
          msgDetails.app.error_descr="Could not parse XML in message";
          msgDetails.app.error_string=xml;
        }
        return insertIntoDatabase(msgDetails,callback);
      });
    } else {
      msgDetails.severity="Error";
      msgDetails.app.error_descr="SNS message could not be parsed or did not have message element";
      msgDetails.app.error_string=event.Records[0].Sns.Message;
      return insertIntoDatabase(msgDetails,callback);
    }
}


exports.handler = function(event, context) {
  parseSnsMessage(event,function() {
    context.done(null,'');
  });
};

