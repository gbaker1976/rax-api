var https = require( 'https' );
var token;
var serviceCatalog = [];

/*
 * module: rax-auth
 *
 * description:
 * Handles retreival and management of auth tokens from the Rackspace identity
 * service.
 */

module.exports = function( config ){
  return {
    checkToken: function( callback ){
      /*
       * Check existence of token as well as token being within sixty seconds of
       * expiration.
       */
      if ( !token || Date.now() >= ( token.ttl - 60000) ) {
        getToken( config, function( err, token ){
          if ( err ) {
            callback( err );
          }
          callback( null, token );
        });
      } else {
        callback( null, token.id );
      }
    },

    getEndpoint: function( serviceName ){
      var service;
      var endpoint;
      var serviceConfig;

      if ( !serviceName ) {
        console.error( "You must supply a service name!" );
        return;
      }

      serviceConfig = config.rackspace[ serviceName ];

      if ( !serviceConfig ) {
        console.error( "Configuration not found for service: %s", serviceName );
        return;
      }

      if ( !serviceConfig.endpointType ) {
        console.error( "Endpoint type configuration not found!" );
        return;
      }

      serviceCatalog.some( function( s ){
        if ( serviceName === s.name ) {
          service = s;
          return true;
        }
      });

      service.endpoints.some(function( e ){
        if ( config.rackspace.region === e.region ) {
          endpoint = e;
          return true;
        }
      });

      return endpoint[ serviceConfig.endpointType ];
    }
  };
};

/*
 * function: getToken
 *
 * description:
 * Requests an auth token from the Rackspace identity service.
 *
 * params:
 * - config The config object to use.
 * - callback The callback to call after a token has been retreived.
 */
function getToken( config, callback ){
  var buf = [];
  var payload = JSON.stringify({
    auth: {
      "RAX-KSKEY:apiKeyCredentials": {
        username: config.rackspace.username,
        apiKey: config.rackspace.apiKey
      }
    }
  });
  var opts = {
    hostname: config.rackspace.identityService.host,
    port: config.rackspace.identityService.port,
    path: config.rackspace.identityService.service,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': payload.length
    }
  };
  var req = https.request( opts, function( res ){
    var error;

    if ( 400 <= res.statusCode ) {
      error = true;
      console.error( "Rax Auth - Unsuccessful request: %s code sent.", res.statusCode );
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
        saveServiceCatalog( payload );
        token = payload.access.token;
        token.ttl = Date.parse( token.ttl );
        callback( null, token.id );
      }
    });

    res.on( 'close', function(){
      callback( "Rax Auth - Connection closed before end/flush" );
    });
  });

  req.on( 'error', function( err ){
    console.error( "Rax Auth - Request error:\n%s", err );
  });

  req.write( payload );
  req.end();
}

/*
 * function: saveServiceCatalog
 *
 * description:
 * Saves service catalog delivered as part of an auth token response.
 *
 * params:
 * - payload The payload from the Rackspace identity token response.
 */
function saveServiceCatalog( payload ){

  if ( !payload || !payload.access || !payload.access.serviceCatalog ) {
    return;
  }

  serviceCatalog = payload.access.serviceCatalog;
}
