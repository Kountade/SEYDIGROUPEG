import './App.css'
import Register from './components/Register'
import Login from './components/Login'
import Home from './components/Home'
import Navbar from './components/Navbar'
import { Routes, Route , useLocation} from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoutes'
import PasswordResetRequest from './components/PasswordResetRequest'
import PasswordReset from './components/PasswordReset'

import Agences from './components/agences/Agences'
import CreerAgence from './components/agences/CreerAgence'
import Units from './components/logistique/Units'





function App() {
 
  const location = useLocation()
  // Correction : inverser la condition
  const noNavBar = location.pathname === "/" || location.pathname === "/register" || location.pathname.includes("password")
  
  return (
    <>
    {
      noNavBar ?
      // Pas de Navbar pour login et register
      <Routes>
          <Route path="/register" element={<Register />} />
         <Route path="/" element={<Login />} />
          <Route path="/request/password_reset" element={<PasswordResetRequest/>}/>
          <Route path="/password-reset/:token" element={<PasswordReset/>}/>
      </Routes>
      :
      // Avec Navbar pour les autres routes
      <Navbar 
        content={
      <Routes>
            <Route element={<ProtectedRoute/>}> 
                <Route path="/home" element={<Home/>}/>
            
                <Route path="/home" element={<Home/>}/>
               <Route path="/agences" element={<Agences/>}/>
               <Route path="/creer-agence" element={<CreerAgence/>}/>

               
              <Route path="/units" element={<Units/>}/>



      
            </Route>
          </Routes>
        }
        />
    }
    </>
  )
}

export default App