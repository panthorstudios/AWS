var lambda=require("./index.js")

//var severity = "Warning";
var severity = "Error";

var msgbody="{\"message\":\"" 
   + "<ErrorMessage>"  
   + "<MachineName>internal</MachineName>" 
   + "<ApplicationName>ABC</ApplicationName>" 
   + "<ComponentName>SQLReplConn10</ComponentName>"
   + "<Severity>" + severity + "</Severity>"
   + "<ErrorDate>2015-07-07 13:02:20</ErrorDate>"
   + "<AsOfDate>2015-07-07 13:02:20</AsOfDate>"
   + "<ApplicationErrorCode>100</ApplicationErrorCode>"
   + "<ApplicationErrorDescription>Failed To Make SQL Server Connection</ApplicationErrorDescription>"
   + "<ApplicationErrorString>Status Failed</ApplicationErrorString>"
   + "<SystemErrorCode>timeout</SystemErrorCode>"
   + "<SystemErrorDescription>The module execution was aborted because the timeout was exceeded.</SystemErrorDescription>"
   + "<SystemErrorString></SystemErrorString>"
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
 


