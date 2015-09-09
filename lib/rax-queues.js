var raxAuth = require( './rax-auth' );
var https = require( 'https' );
var url = require( 'url' );

module.exports = function( config ){
  raxAuth = raxAuth( config );

  this.publish = function( queue, messageBody, callback ){
    var message = [{
      ttl: 300,
      body: messageBody
    }];
    var headers = {
      'Client-ID': config.rackspace.clientId
    };
    callback = callback || function(){};
    request( raxAuth, '/queues/' + queue + '/messages', 'POST', headers, message, callback );
  };

  this.getMessages = function( queue, callback ){
    var headers = {
      'Client-ID': config.rackspace.clientId
    };
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

    opts = url.parse( rax.getEndpoint( 'cloudQueues' ).publicURL + path );

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

      if ( 204 < res.statusCode ) {
        error = true;
      }

      if ( 204 === res.statusCode ) {
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
          if ( buf.length ) {
            payload = JSON.parse( buf.join( '' ) );
          }
          callback( null, payload );
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
