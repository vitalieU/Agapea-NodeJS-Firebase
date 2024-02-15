
//objeto javascript q tiene como props. funciones para hacer pasos del pago con tarjeta usando stripe
//para hacer peticiones REST a STRIPE uso axios (puedes usar fecht-api, XMLHttpRequest, ....)
const axios=require('axios');
const _clienteHttp=axios.create(
    {
        baseURL: 'https://api.stripe.com/v1/',
        headers: {
            'Authorization': `Bearer ${process.env.STRIPE_API_KEY}`
        }        
    }
);

//OJO!!!! Q LA API DE STRIPE NO ADMITE JSONS...hay q pasar los valores en formato x-www-form-urlencoded
//truco:  puedes pasar un json a prototipo URLSearchParam  y te lo convierte a ese formato

module.exports={
    createCustomer: async ( datosclientelogged)=>{
        try {
            let _dirppal=datosclientelogged.direcciones.filter(direc=> direc.esPrincipal===true)[0];
            let _customerStripeValues=new URLSearchParams(            
                                                            {
                                                                'name': datosclientelogged.nombre,
                                                                'email': datosclientelogged.cuenta.email,
                                                                'phone': datosclientelogged.telefono,
                                                                'address[city]': _dirppal.municipio.DMUN50 ,
                                                                'address[state]': _dirppal.provincia.PRO,
                                                                'address[country]': _dirppal.pais,
                                                                'address[postal_code]': _dirppal.cp.toString() ,
                                                                'address[line1]': _dirppal.calle                
                                                            }
                                            ).toString();

           let _respuesta=await _clienteHttp.post('customers', _customerStripeValues);
           
           if (_respuesta.status===200) {
                console.log('respuesta de stripe cuando creamos CUSTOMER...', _respuesta.data);
                return _respuesta.data.id;
            
           } else {
             return null;
           }
        } catch (error) {
            console.log('error al intentar crear CUSTOMER de STRIPE...', error);
            return null;
        }

    },
    createCardFromCustomer: async(clienteStripeId)=>{
        try {

            let _cardStripeValues=new URLSearchParams( { 'source': 'tok_visa'} ).toString();

            let _respuesta=await _clienteHttp.post(`customers/${clienteStripeId}/sources`, _cardStripeValues);
           
            if (_respuesta.status===200) {
                console.log('respuesta de stripe cuando creamos CARD...', _respuesta.data);
                return _respuesta.data.id;
            } else {
              return null;
            }
             
        } catch (error) {
            console.log('error al intentar crear CARD asociado al CUSTOMER de STRIPE...', error);
            return null;
            
        }

    },
    createCharge: async(clienteStripeId, cardId, totalPedido, idpedido)=>{
        try {
            let _bodyrequest=new URLSearchParams(
                {
                'customer': clienteStripeId,
                'source': cardId,
                'currency': 'eur',
                'amount': (totalPedido * 100).toString(),
                'description': idpedido
                }
            ).toString();

            let _respuesta=await _clienteHttp.post(`charges`,_bodyrequest);

            if (_respuesta.status===200) {
                console.log('respueta de stripe cuando creamos CARD asociada al customer...', _respuesta);
                return _respuesta.data.status==='succeeded';
            } else {
                return null;
            }

        } catch (error) {
            console.log('error al intentar crear con stripe un objeto CHARGE (pago) asociado al card del customer....', error);
            return null;                  
        }        
    }
}