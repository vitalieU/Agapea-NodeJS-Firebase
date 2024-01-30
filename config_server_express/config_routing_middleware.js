const routingCliente=require('./routingCliente');
const routingTienda=require('./routingTienda');

module.exports = function (serverExpress) {
    serverExpress.use('/api/Cliente', routingCliente) 
    serverExpress.use('/api/Tienda', routingTienda) 
};                                            
