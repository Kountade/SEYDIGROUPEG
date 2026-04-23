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
import UnitForm from './components/logistique/UnitForm'
import Brands from './components/logistique/Brands'
import BrandForm from './components/logistique/BrandForm'
import Variants from './components/logistique/Variants'
import VariantForm from './components/logistique/VariantForm'
import Products from './components/logistique/Products'
import ProductForm from './components/logistique/ProductForm'
import ProductDetails from './components/logistique/ProductDetails'
import Categories from './components/logistique/Categories'
import CategoryForm from './components/logistique/CategoryForm'




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
               <Route path="/units/nouveau" element={<UnitForm />} />
              <Route path="/units/:id/modifier" element={<UnitForm />} />

               {/* Marques */}
                <Route path="/brands" element={<Brands />} />
                <Route path="/brands/nouveau" element={<BrandForm />} />
                <Route path="/brands/:id/modifier" element={<BrandForm />} /> 

               {/* Variantes (si page dédiée)  */}
               <Route path="/variants" element={<Variants />} />
               <Route path="/variants/nouveau" element={<VariantForm />} />
               <Route path="/variants/:id/modifier" element={<VariantForm />} />

                 {/* Catégories */}
                 <Route path="/categories" element={<Categories />} />
                 <Route path="/categories/nouveau" element={<CategoryForm />} />
                <Route path="/categories/:id/modifier" element={<CategoryForm />} />


                   {/* Gestion des produits */}
                        <Route path="/produits" element={<Products />} />
                        <Route path="/produits/nouveau" element={<ProductForm />} />
                        <Route path="/produits/:id" element={<ProductDetails />} />
                        <Route path="/produits/:id/modifier" element={<ProductForm />} />


      
            </Route>
          </Routes>
        }
        />
    }
    </>
  )
}

export default App