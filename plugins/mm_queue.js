// mm_queue

// documentation via: haraka -c /Users/nmajor/dev/emailgate-mail -h plugins/mm_queue

// Put your plugin code here
// type: `haraka -h Plugins` for documentation on how to create a plugin

require('dotenv').config();
const PassThrough = require('stream').PassThrough;
const simpleParser = require('mailparser').simpleParser;
const request = require('request');
const crypto = require('crypto');

exports.register = function () {
  this.wehbook_secret = process.env.MM_WEBHOOK_SECRET;
  this.webhook_url = process.env.MM_WEBHOOK_URL;

  this.logdebug('blah register');
  this.logdebug('blah secret ', process.env.MM_WEBHOOK_SECRET);
}

exports.hook_queue = function (next, connection) {
  const plugin = this;
  const transaction = connection.transaction;
  const emailTo = transaction.rcpt_to;
  const emailToUser = emailTo[0].user;
  
  const message = transaction.message_stream.pipe(new PassThrough);
  simpleParser(message)
  .then((messageObj) => {
    const requestBody = JSON.stringify(messageObj);
    const signature = crypto.createHmac('SHA256', this.wehbook_secret).update(requestBody).digest('base64');
    
    plugin.logdebug('blah requestBody', requestBody);
    plugin.logdebug('blah signature', signature);

    request({
      method: 'POST',
      url: `${plugin.webhook_url}/${emailToUser}`,
      headers: {
        'x-webhook-signature': signature,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    }, (error, response, body) => {
      if (error) plugin.logdebug('blah response error', error, error.stack);
      if (response.statusCode === 200) {
        return next(DENY, 'No such user');
      }
      
      plugin.logdebug('blah response', response);

      next(OK, 'Success');
    });
  })
  .catch((err) => {
    plugin.logdebug('blah err', err, err.stack);
  })

  // let data = new Buffer('')
  // 
  // message.on('data', (chunk) => {
  //   plugin.logdebug('blah chunk', chunk);
  //   data = data + chunk;
  // });
  // 
  // message.on('end', () => {
  //   plugin.logdebug('blah message end');
  //   // plugin.logdebug('blah message data', data.toString());
  //   mailparser.write(data);
  //   mailparser.end();
  // });
  
}

exports.shutdown = function () {
    this.loginfo("Shutting down queue plugin.");
};