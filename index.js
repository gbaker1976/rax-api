var raxQ = require( './lib/rax-queues' );

module.exports = function( config ){
  this.queues = raxQ( config );

  return this;
};
