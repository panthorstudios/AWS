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



