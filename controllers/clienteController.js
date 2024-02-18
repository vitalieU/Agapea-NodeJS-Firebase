//para inicializar firebase:  https://firebase.google.com/docs/web/setup?authuser=0&hl=es#add-sdks-initialize
const {initializeApp}=require('firebase/app');
const admin = require('firebase-admin');
//OJO!! nombre variable donde se almacena la cuenta de acceso servicio firebase: FIREBASE_CONFIG (no admite cualquier nombre)
//no meter el json aqui en fichero de codigo fuente como dice la doc...
const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));

//------------ CONFIGURACION ACCESO:  FIREBASE-AUTHENTICATION -------------
const {getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, checkActionCode, applyActionCode}=require('firebase/auth');

const auth=getAuth(app); //<--- servicio de acceso a firebase-authentication

//------------ CONFIGURACION ACCESO:  FIREBASE-DATABASE -------------------
const {getFirestore, getDocs, collection, where, query, addDoc, getDoc}=require('firebase/firestore');

const db=getFirestore(app); //<---- servicio de acceso a todas las colecciones de la BD definida en firebase-database



module.exports={
    login: async (req, res, next)=>{
        try {
            console.log('datos mandados por servicio de angular...', req.body); //{email: ..., password: ....}
        
            //1º inicio de sesion en FIREBASE con email y password:
            // https://firebase.google.com/docs/auth/web/password-auth?authuser=0&hl=es#sign_in_a_user_with_an_email_address_and_password
            let _userCredential=await signInWithEmailAndPassword(auth, req.body.email, req.body.password);
            //console.log('resultado del login en firebase ....', _userCredential);

            //2º recuperar de la bd de firebase-firestore de la coleccion clientes los datos del cliente asociados al email de la cuenta
            //y almacenar el JWT q firebase a originado por nosotros 
            //https://firebase.google.com/docs/firestore/query-data/get-data?hl=es&authuser=0#get_multiple_documents_from_a_collection
            let _clienteSnapShot=await getDocs( query(collection(db,'clientes'),where('cuenta.email','==',req.body.email)) );
            //console.log('snapshot recuperado de clientes...', _clienteSnapShot);
                
            let _datoscliente=_clienteSnapShot.docs.shift().data();
            console.log('datos del clietne recuperados...', _datoscliente);
            req.session.jwt=await _userCredential.user.getIdToken();
            res.status(200).send(
                {
                    codigo: 0,
                    mensaje: 'login oks...',
                    errores: null,
                    datosCliente: _datoscliente,
                    token: await _userCredential.user.getIdToken(),
                    otrosdatos: null
                }
            );

        } catch (error) {
            console.log('error en el login....', error);
            res.status(400).send(
                                    {
                                        codigo: 1,
                                        mensaje:'login fallido',
                                        error: error.message,
                                        datoscliente:null,
                                        token:null,
                                        otrosdatos:null
                                    }
                                );
        }
    },
    registro: async (req,res,next)=>{ 
        try {
            console.log('datos recibidos por el servicio de angular desde comp.registro...', req.body);
            

            //1º creacion de una cuenta FIREBASE dentro de Authentication basada en email y contraseña:
            //https://firebase.google.com/docs/auth/web/password-auth?authuser=0&hl=es#create_a_password-based_account
            let _userCredential=await createUserWithEmailAndPassword(auth, req.body.email, req.body.password);
            console.log('resultado creacion creds. usuario  recien registrado....', _userCredential);

            //2º mandamos email de activacion de cuenta:
            await sendEmailVerification(_userCredential.user);

            //3º almacenamos los datos del cliente (nombre, apellidos, ...) en coleccion clientes de firebase-database
            //https://firebase.google.com/docs/firestore/manage-data/add-data?hl=es&authuser=0#add_a_document
            const cliente={
                nombre: req.body.nombre,
                apellidos: req.body.apellidos,
                cuenta: {
                    email: req.body.email,
                    login:req.body.login,
                    ImagenBASE64:''
                },
                telefono: req.body.telefono,
                direcciones:[],
                pedidos:[]

            }
            let _clienteRef=await addDoc(collection(db,'clientes'),cliente);
            console.log('ref.al documento insertado en coleccion clientes de firebase...', _clienteRef);


            res.status(200).send(
                {
                    codigo: 0,
                    mensaje: 'registro oks...',
                    errores: null,
                    datosCliente: _userCredential.user,
                    token: await _userCredential.user.getIdToken(),
                    otrosdatos: null                    
                }
            );
        } catch (error) {
            console.log('error en el registro....', error);
            res.status(400).send(
                                    {
                                        codigo: 1,
                                        mensaje:'registro fallido',
                                        error: error.message,
                                        datoscliente:null,
                                        token:null,
                                        otrosdatos:null
                                    }
                                );           
        }
    },
    comprobarEmail: async (req,res,next)=>{
        try{
            console.log('Datos recibidos desde el cliente de Angular', req.query);
            let _clienteSnapshot = await getDocs(query(collection(db, 'clientes'),where('cuenta.email','==',req.query.email)));
            console.log('Resultado de la query de clientes: ', _clienteSnapshot.docs);
            if (_clienteSnapshot.docs.length==0) throw new Error('email incorrecto');
            let _datoscliente = _clienteSnapshot.docs.shift().data();
            console.log('Resultado de la query de clientes: ', _datoscliente);
            if(_datoscliente){
              res.status(200).send({
                codigo: 0,
                mensaje: "email correcto",
                datosCliente: _datoscliente,
                tokensesion: null,
                otrodatos: null,
              });
            }else{
              throw new Error('email incorrecto');
            }
          }catch(error){
            console.log('error al comprobar el email', error);
            res.status(400).send({
              codigo: 1,
              mensaje: "error a la hora de comprobar el email",
              error: error.message,
              datosCliente:null,
              tokensesion:null,
              otrodatos:null
            });
          }

    },
    activarCuenta: async  (req,res,next)=>{
        try {
            let { mod,cod,key}=req.query;
            //1º comprobar si el token de activacion de la cuenta es para verificar-email o no 
            // lo ideal tb seria comprobar q el token enviado pertenece al usuario q quiere activar la cuenta (su email)
            let _actionCodeInfo=await checkActionCode(auth,cod); //<---objeto clase ActionCodeInfo
            console.log('actioncodeinfo en activar cuenta usuario firebase....', _actionCodeInfo);
    
            if(_actionCodeInfo.operation=='VERIFY_EMAIL'){
                //en _actionCodeInfo.data <--- email, comprobar si exite en clientes...
                await applyActionCode(auth,cod);
                res.status(200).send(
                    {
                        codigo: 0,
                        mensaje:'activacion cuenta oks',
                        error: null,
                        datosCliente:null,
                        token:null,
                        otrosdatos:null
                    }
                );                   

            }else {
                throw new Error('token no valido para verificar EMAIL...');
            }
                
        } catch (error) {
            console.log('error en activacion cuenta usuario....', error);
            res.status(400).send(
                                    {
                                        codigo: 1,
                                        mensaje:'activacion cuenta fallida',
                                        error: error.message,
                                        datosCliente:null,
                                        token:null,
                                        otrosdatos:null
                                    }
                                );             
        }

    },

    uploadImage: async (req, res, next)=>{
    try {
        //tengo q coger la extension del fichero, en req.body.imagen:  data:image/jpeg
        let _nombrefichero='imagen____' + req.body.emailcliente;//  + '.' + req.body.imagen.split(';')[0].split('/')[1]   ;
        console.log('nombre del fichero a guardar en STORGE...',_nombrefichero);
        let _result=await uploadString(ref(storage,`imagenes/${_nombrefichero}`), req.body.imagen,'data_url'); //objeto respuesta subida UploadResult         
    
        //podrias meter en coleccion clientes de firebase-database en prop. credenciales en prop. imagenAvatar
        //el nombre del fichero y en imagenAvatarBASE&$ el contenido de la imagen...
        let _refcliente=await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',req.body.emailcliente)));
        _refcliente.forEach( async (result) => { 
            await updateDoc(result.ref, { 'cuenta.imagenAvatarBASE64': req.body.imagen } );
        });
        
        res.status(200).send(
            {
                codigo: 0,
                mensaje: 'subida imagen oks...',
                errores: null,
                datosCliente: null,
                token: null,
                otrosdatos: null
            }
        );
    } catch (error) {
        console.log('error subida imagen...',error);
        res.status(400).send(
                                {
                                    codigo: 1,
                                    mensaje:'subida imagen fallida',
                                    error: error.message,
                                    datosCliente:null,
                                    token:null,
                                    otrosdatos:null
                                }
                            );

    }
    },
    finalizarPedido: async (req, res, next)=>{
        
    }
}