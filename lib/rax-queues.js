var raxAuth = require( './rax-auth' );
var https = require( 'https' );
var url = require( 'url' );

module.exports = function( config ){
  var headers = {
    'Client-ID': config.rackspace.clientId
  };

  raxAuth = raxAuth( config );

  this.publish = function( queue, messageBody, callback ){
    var message = [{
      ttl: 300,
      body: messageBody
    }];
    callback = callback || function(){};
    request( raxAuth, '/queues/' + queue + '/messages', 'POST', headers, message, callback );
  };

  this.getMessages = function( queue, callback ){
    callback = callback || function(){};
    request( raxAuth, '/queues/' + queue + '/messages', 'GET', headers, null, callback );
  };

  return this;
};

function request( rax, path, method, headers, payload, callback ){
  payload && ( payload = JSON.stringify( payload ));
  headers || ( headers = {} );

  rax.checkToken( function( err, token ){
    var opts;

    if ( err ) {
      console.error( err );
    }

    opts = url.parse( rax.getEndpoint( 'cloudQueues' ) + path );

    opts.port = 443;
    opts.method = method;
    opts.headers = headers;
    opts.headers[ 'X-Auth-Token' ] = token;
    opts.headers[ 'content-type' ] = 'application/json';

    if ( payload ) {
      opts.headers[ 'content-length' ] = payload.length;
    }

    req = https.request( opts, function( res ){
      var buf = [];
      var error;

      if ( 400 <= res.statusCode ) {
        error = true;
        console.error( "Rax Queues - Unsuccessful request: %s code sent.", res.statusCode );
      }

      res.on( 'data', function( data ){
        buf.push( data );
      });

      res.on( 'end', function(){
        var payloadData;

        if ( error ) {
          callback( buf.join( '' ) );
        } else {
          if ( buf.length ) {
            payloadData = JSON.parse( buf.join( '' ) );
          }
          callback( null, payloadData );
        }
      });

      res.on( 'close', function(){
        callback( "Rax Queues - Connection closed before end/flush" );
      });
    });

    req.on( 'error', function( err ){
      console.error( "Rax Queues - Request error:\n%s", err );
    });

    if ( payload ) {
      req.write( payload );
    }

    req.end();
  });

}
