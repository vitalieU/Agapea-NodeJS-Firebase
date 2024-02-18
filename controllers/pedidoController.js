//para inicializar firebase:  https://firebase.google.com/docs/web/setup?authuser=0&hl=es#add-sdks-initialize
const {initializeApp}=require('firebase/app');
const admin = require('firebase-admin');

//OJO!! nombre variable donde se almacena la cuenta de acceso servicio firebase: FIREBASE_CONFIG (no admite cualquier nombre)
//no meter el json aqui en fichero de codigo fuente como dice la doc...
const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT)),
   databaseURL:'https://agapea2324.firebaseio.com'
});
//------------ CONFIGURACION ACCESO:  FIREBASE-AUTHENTICATION -------------
const {getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, checkActionCode, applyActionCode, }=require('firebase/auth');

const auth=getAuth(app); //<--- servicio de acceso a firebase-authentication

//------------ CONFIGURACION ACCESO:  FIREBASE-DATABASE -------------------
const {getFirestore, getDocs, collection, where, query, addDoc, getDoc, setDoc, doc}=require('firebase/firestore');

const db=getFirestore(app); //<---- servicio de acceso a todas las colecciones de la BD definida en firebase-database

const paypalService=require('../service/paypalservice');

module.exports={
    finalizarPedido: async (req, res)=>{
        try{
           const{pedido, email}=req.body;
           const jwt =req.headers.authorization.split('Bearer ')[1];
           //comporbar si el jwt de firebase es valido
            const user = await (await admin.auth().verifyIdToken(jwt)).uid;
            
            if (!user) throw new Error('usuario no autenticado');
            //añadir pedido en el array de pedidos de cliente segun el id del cliente
            const _clienteSnapshot = await getDocs(query(collection(db, 'clientes'),where('cuenta.email','==',email)));
            if (_clienteSnapshot.empty) throw new Error('cliente no encontrado');
            //insertar en _clienteSnapshot.pedido el pedido
            const _cliente=_clienteSnapshot.docs[0].data();
            _cliente.pedidos.push(pedido);
            await setDoc(doc(db, 'clientes', _clienteSnapshot.docs[0].id), _cliente);    
            
            const resp =await paypalService.crearPagoPayPal(pedido, email);
            if (!resp) throw new Error('error al crear pago en paypal');
            res.status(200).send(
                {
                    codigo: 0,
                    mensaje: 'PAGO CREADO CON PAYPAL',
                    errores: null,
                    datosCliente: _cliente,
                    token:jwt,
                    otrosdatos: resp 
                }
            );
            
        }catch(error){
            res.status(400).send(
                {
                    codigo: 1,
                    mensaje: 'error al finalizar pedido',
                    errores: error.message,
                    datosCliente: null,
                    token:null,
                    otrosdatos: null
                });
        }
    },
    payPalCallback : async (req, res)=>{
        try {
            const {email, pedid, Cancel}=req.query;
            if (Cancel) throw new Error('pago cancelado');
            
            //const _pedidoSnapshot = await getDocs(query(collection(db, 'clientes'),where('pedido.idPedido','==',pedid)));
            //buscar dentro de cliente.pedidos si hay algun epdido con el idPedido que tenemos nosotros
            /*const _clienteSnapshot = await getDocs(query(collection(db, 'clientes'),where('cuenta.email','==',email)));
            if (_clienteSnapshot.empty) throw new Error('pedido no encontrado');
            const cliente=_clienteSnapshot.docs[0].data();
            const index = cliente.pedidos.filter(pedido=>pedido.idPedido===pedid);
            const finPagoPayPal= await paypalService.finalizarPagoPayPal(index[0].idPago);
            if (!finPagoPayPal) throw new Error('error al finalizar pago en paypal');
            //buscar el pedido en el array de pedidos del cliente y cambiar el estado a pagado
            //actualizar el pedido en la base de datos
            cliente.filter(pedido=>pedido.idPedido===pedid).estado='pagado';
            await setDoc(doc(db, 'clientes', _clienteSnapshot.docs[0].id), cliente);
            */

            const pagopaypal = await getDocs(query(collection(db, 'pagospaypal'),where('idpedido','==',pedid)));
            if (pagopaypal.empty) throw new Error('pago no encontrado');
            const _pagopaypal=pagopaypal.docs[0].data();
            const finPagoPayPal= await paypalService.finalizarPagoPayPal(_pagopaypal.idpago);
            if (!finPagoPayPal) throw new Error('error al finalizar pago en paypal');
           const clienteSnapshot = await getDocs(query(collection(db, 'clientes'),where('cuenta.email','==',email)));
            if (clienteSnapshot.empty) throw new Error('cliente no encontrado');
            const cliente=clienteSnapshot.docs[0].data();
            cliente.pedidos.filter(pedido=>pedido.idPedido===pedid).estado='pagado';
            await setDoc(doc(db, 'clientes', clienteSnapshot.docs[0].id), cliente);

            res.status(200).redirect('http://localhost:4200/Tienda/PedidoFinalizado'); 

        } catch (error) {
            res.status(200).redirect('http://localhost:4200/Cliente/Login');
        }
    },

    obtenerDatosCliente: async (req, res)=>{
        try {
            jwt =req.headers.authorization.split('Bearer ')[1];
            const user = await admin.auth().verifyIdToken(jwt);
            if (!user) throw new Error('usuario no autenticado');
            const _clienteSnapshot = await getDocs(query(collection(db, 'clientes'),where('cuenta.email','==',user.email)));
            if (_clienteSnapshot.empty) throw new Error('cliente no encontrado');
            const _cliente=_clienteSnapshot.docs[0].data();
            res.status(200).send(
                {
                    codigo: 0,
                    mensaje: 'CLIENTE ENCONTRADO',
                    errores: null,
                    datosCliente: _cliente,
                    token:jwt,
                    otrosdatos: null
                }
            );
        } catch (error) {
            res.status(400).send(
                {
                    codigo: 1,
                    mensaje: 'error al obtener datos del cliente',
                    errores: error.message,
                    datosCliente: null,
                    token:null,
                    otrosdatos: null
                }
            );   
        }
    }
};