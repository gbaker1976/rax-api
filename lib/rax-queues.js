var raxAuth = require( './rax-auth' );
var https = require( 'https' );
var url = require( 'url' );

module.exports = function( config ){
  raxAuth = raxAuth( config );

  this.subscribe = function( queue, callback ) {
    var that = this;

    setInterval( function(){
      that.getMessages( queue, function( err, messages ){
        if ( err ) {
    			console.log( err );
    			return;
    		}
    		callback( messages );
      });
    }, 1000 );
  };

  this.publish = function( queue, messageBody, callback ){
    var message = {
      ttl: 300,
      body: messageBody
    };
    callback = callback || function(){};
    request( raxAuth, '/queues/' + queue + '/messages', 'POST', message, callback );
  };

  this.getMessages = function( queue, callback ){
    callback = callback || function(){};
    request( raxAuth, '/queues/' + queue + '/messages', 'GET', null, callback );
  };

  return this;
};

function request( rax, path, method, payload, callback ){
  payload && (payload = JSON.stringify( payload ));

  rax.checkToken( function( err, token ){
    var opts;

    if ( err ) {
      console.error( err );
    }

    opts = url.parse( rax.getEndpoint( 'cloudQueues' ).publicURL + path );

    opts.port = 443;
    opts.method = method;
    opts.headers = {
      'X-Auth-Token': token,
      'content-type': 'application/json'
    };

    if ( payload ) {
      opts.headers[ 'content-length' ] = payload.length;
    }

    req = https.request( opts, function( res ){
      var buf = [];
      var error;

      if ( 204 < res.responseCode ) {
        error = true;
      }

      if ( 204 === res.responseCode ) {
        callback();
      }

      res.on( 'data', function( data ){
        buf.push( data );
      });

      res.on( 'end', function(){
        var payload;

        if ( error ) {
          callback( buf.join( '' ) );
        } else {
          payload = JSON.parse( buf.join( '' ) );
          callback( payload.messages );
        }
      });
    });

    req.on( 'error', function( err ){
      console.error( err );
    });

    if ( payload ) {
      req.write( payload );
    }

    req.end();
  });

}
