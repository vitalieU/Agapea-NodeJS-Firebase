const axios=require('axios');
//------------ CONFIGURACION ACCESO:  FIREBASE-AUTHENTICATION -------------
const {initializeApp}=require('firebase/app');
//OJO!! nombre variable donde se almacena la cuenta de acceso servicio firebase: FIREBASE_CONFIG (no admite cualquier nombre)
//no meter el json aqui en fichero de codigo fuente como dice la doc...
const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
const {getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, checkActionCode, applyActionCode}=require('firebase/auth');

const auth=getAuth(app); //<--- servicio de acceso a firebase-authentication

//------------ CONFIGURACION ACCESO:  FIREBASE-DATABASE -------------------
const {getFirestore, getDocs, collection, where, query, addDoc, getDoc}=require('firebase/firestore');

const db=getFirestore(app); //<---- servicio de acceso a todas las colecciones de la BD definida en firebase-database

async function getAccessTokenPAYPAL(){
    //para obtener token de servicio en paypal debo pasar en base64 la combinacion "clientid:clientsecret"
    //en cabecera Authorization: Basic .....
    let _base64Auth=Buffer.from(`${process.env.PAYPAL_CLIENTID}:${process.env.PAYPAL_CLIENTSECRET}`).toString('base64');
    try {
        let _response=await axios(
            {
                method: 'POST',
                url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
                data: 'grant_type=client_credentials',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${_base64Auth}`
                }

            }
        );
        
        if (_response.status===200) {
            console.log('auth token de servicio recibido ok....', _response.data);
            return _response.data.access_token;
        } else {
            throw new Error('error al intentar obtener token de servicio de paypal' + _response.data);
        }

    } catch (error) {
        console.log('error al intentar recuperar token de servicio paypal...', error);
        return null;
    }
}

module.exports={
    crearPagoPayPal: async (pedido, email )=>{
        try {
            let _accessToken=await getAccessTokenPAYPAL();
            if (! _accessToken) throw new Error('no hay token de servicio de acceso a PayPal');
/*
            let _order={
                intent : "CAPTURE",
                purchase_units: [
                    {
                        items: pedidoActual.elementosPedido.map( elem => {
                            return {
                                name: elem.libroElemento.Titulo,
                                quantity: elem.cantidadElemento.toString(),
                                unit_amount: { currency_code: 'EUR', value: elem.libroElemento.Precio.toString() }
                            }
                        } ),
                        amount: {
                            currency_code: 'EUR',
                            value: pedidoActual.totalPedido.toString(),
                            breakdown: {
                                item_total: { currency_code: 'EUR', value: pedidoActual.subTotalPedido.toString() },
                                shipping:   { currency_code: 'EUR', value: pedidoActual.gastosEnvio.toString() }
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: `http://localhost:3003/api/Pedido/PayPalCallback?idcli=${idcliente}&pedid=${pedidoActual._id}`,
                    cancel_url: `http://localhost:3003/api/Pedido/PayPalCallback?idcli=${idcliente}&pedid=${pedidoActual._id}&Cancel=true`
                }
            };

}*/
            let _order={
                intent : "CAPTURE",
                purchase_units: [
                    {
                        items: pedido.elementosPedido.map( elem => {
                            return {
                                name: elem.libroElemento.Titulo,
                                quantity: elem.cantidadElemento.toString(),
                                unit_amount: { currency_code: 'EUR', value: elem.libroElemento.Precio.toString() }
                            }
                        } ),
                        amount: {
                            currency_code: 'EUR',
                            value: pedido.totalPedido.toString(),
                            breakdown: {
                                item_total: { currency_code: 'EUR', value: pedido.subTotalPedido.toString() },
                                shipping:   { currency_code: 'EUR', value: pedido.gastosEnvio.toString() }
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: `http://localhost:3003/api/Pedido/PayPalCallback?email=${email}&pedid=${pedido.idPedido}`,
                    cancel_url: `http://localhost:3003/api/Pedido/PayPalCallback?email=${email}&pedid=${pedido.idPedido}&Cancel=true`
                }
            };
            

            /*
                  cliente react                                 servicio nodejs                                  servidor paypal
                   finalizao pago           ------------------->  pedidocontroller.finalizarPedido
                                                                            |
                                                                    paypalService.crearPagoPayPal        axios
                                                                        _order(return_url, cancel_url) ---------------> create order (links)
                                                                               link.approved           <-------------------
                                <-------------------------------------------------|
                                        json.otrosdatos(link.approved)
                        |--------------------------------------------------------------------------------------------> creds, y finaliza pago
                                                                         paypalcallback  <--------------------------------------| return_url
                                                                         (del return_url: idcliente, idpedido)
                                                                         !!NECESITO EL ORDERID ¿¿como lo obtengo?? en el return_rul no he podido meterlo pq paypal aun no ha aprovado el cargo...
                                                                         y no tengo estado de sesion definido en nodejs ¿¿solucion?? crear una coleccion en MONGODB
            */
            let _respuesta=await axios(
                {
                    method: 'POST',
                    url:'https://api.sandbox.paypal.com/v2/checkout/orders',
                    data: JSON.stringify(_order),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${_accessToken}`
                    }
                }
            );
            console.log('respuesta recibida de paypal al mandar objeto ORDER...', _respuesta);
            
            if (_respuesta.status===201) { //<----- OJO!!! revisar pq paypal a veces devuelve codigo 201 como correcto....
                    //en _respueta.data solo me interesa el ID-PAGO y prop. links q es un array de objetos { rel: ..., href: ... }
                    //el q tenga en .rel='approve'
                    //let _saveOrderId=await new PagosPayPal({ idpago:_respuesta.data.id , idcliente, idpedido: pedidoActual._id}).save();
                    //console.log('resultado del insert del id-pago paypal en mongodb....', _saveOrderId);

                    //añadir a firebase el id-pago de paypal, idcliente, idpedido
                    let _docRef=await addDoc(collection(db, 'pagospaypal'), { idpago: _respuesta.data.id, email:email, idpedido: pedido.idPedido});
                    console.log('id-pago paypal insertado en firebase...', _docRef.id);


                    return _respuesta.data.links.filter( link=>link.rel==='approve')[0].href;
                    
            } else {
                throw new Error('error al crear orden de pago en paypal...');    
            }

        } catch (error) {
            console.log('error al intentar crear orden de pago en paypal....', error);
            return null;
        }
    },
    finalizarPagoPayPal: async (orderid)=>{
        try {
            let _tokenServicioPayPal=await getAccessTokenPAYPAL();
            if (! _tokenServicioPayPal) throw new Error('error al obtener token de servicio paypal, no puedo finalizar pago');

            let _respuesta=await axios(
                {
                    method: 'POST',
                    url:`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderid}/capture`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${_tokenServicioPayPal}`
                    }
                }
            );
            console.log('respuesta finalizar pago por parte de paypal...', _respuesta);

            if (_respuesta.status===201) { //OJO!!! revisar codigo de respuesta pq paypal puede dar 201...
                return true;
            } else {
                throw new Error('error al caputrar pago por paypal y finiquitarlo...');
            }

        } catch (error) {
            console.log('error al capturar pago por paypal y finalizarlo...', error);
            return false;
        }
    },

    
}