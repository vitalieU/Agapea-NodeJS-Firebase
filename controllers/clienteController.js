const {initializeApp}=require('firebase/app');
const app=initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
const {getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword, sendEmailVerification}=require('firebase/auth');
const auth=getAuth(app); //servicio de accesio a firebase-authentication


const {getFirestore,doc,setDoc, getDoc}=require('firebase/firestore');

const db=getFirestore(app); //servicio de acceso a firebase-firestore
module.exports={


  login: async (req, res, next)=>{

    try {
      let _userCredentials=await signInWithEmailAndPassword(auth,req.body.email,req.body.password);
      console.log('resultado de login: ',_userCredentials);

      //recuperar de firestore de la colecccion clientes los datos del cliente asociado al email de la cuenta
      //y almacenar el jwt q firebase a orginado por nosotros

      let _clienteSnapShot=await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',req.body.email)));

      let _datosCliente=_clienteSnapShot.docs[0].data();

      res.status(200).send({
        codigo:0,
        mensaje:"login correcto",
        error:null,
        datoscliente:_datosCliente,
        token:await _userCredentials.user.refreshToken,
        otrosdatos:null

      });

    } catch (error) {
      console.log('error en login: ',error);
      res.status(401).send({
        codigo:1,
        mensaje:"login incorrecto",
        error:error,
        datoscliente:null,
        token:null,
        otrosdatos:null

      });
    }

  },
  registro: async (req,res,next)=>{ 

    try {
      let {cuenta, ...restocliente}=req.body;
      let _userCredentials=await createUserWithEmailAndPassword(auth,cuenta.email,cuenta.password);
      await sendEmailVerification(_userCredentials.user);

      //almacenar en firestore los datos del cliente
      //https://firebase.google.com/docs/firestore/manage-data/add-data?hl=es&authuser=0#add_a_document
      let _clienteRef=doc(db,'clientes',_userCredentials.user.uid);
      await setDoc(_clienteRef,{...restocliente,cuenta:{...cuenta,uid:_userCredentials.user.uid}});
      console.log('registro correcto: ',_userCredentials);

      res.status(200).send({

        codigo:0,
        mensaje:"registro correcto",
        error:null,
        datoscliente:null,
        token:await _userCredentials.user.refreshToken,
        otrosdatos:null
      });
    } catch (error) {
      res.status(401).send({
        codigo:1,
        mensaje:"registro incorrecto",
        error:error,
        datoscliente:null,
        token:null,
        otrosdatos:null
      });
    }

  }
} 