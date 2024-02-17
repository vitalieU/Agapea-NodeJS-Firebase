const routingCliente=require('./routingCliente');
const routingTienda=require('./routingTienda');
const routingPedido=require('./routingPedido');

module.exports = function (serverExpress) {
    serverExpress.use('/api/Cliente', routingCliente) 
    serverExpress.use('/api/Tienda', routingTienda) 
    serverExpress.use('/api/Pedido', routingPedido)
};                                            
