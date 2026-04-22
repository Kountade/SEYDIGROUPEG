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
import Products from './components/produits/Products'
import ProductForm from './components/produits/ProductForm'
import ProductDetails from './components/produits/ProductDetails'
import Categories from './components/produits/Categories'   
import CategoryForm from './components/produits/CategoryForm'
import Brands from './components/produits/Brands'
import BrandForm from './components/produits/BrandForm'
import Units from './components/produits/Units'
import UnitForm from './components/produits/UnitForm'
import Variants from './components/produIts/Variants'
import VariantForm from './components/produits/VariantForm'




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

               

                            {/* Gestion des produits */}
                        <Route path="/produits" element={<Products />} />
                        <Route path="/produits/nouveau" element={<ProductForm />} />
                        <Route path="/produits/:id" element={<ProductDetails />} />
                        <Route path="/produits/:id/modifier" element={<ProductForm />} />

                        {/* Catégories */}
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/categories/nouveau" element={<CategoryForm />} />
                        <Route path="/categories/:id/modifier" element={<CategoryForm />} />

                        {/* Marques */}
                        <Route path="/brands" element={<Brands />} />
                        <Route path="/brands/nouveau" element={<BrandForm />} />
                        <Route path="/brands/:id/modifier" element={<BrandForm />} /> 

                        {/* Unités  */}
                        <Route path="/units" element={<Units />} />
                        <Route path="/units/nouveau" element={<UnitForm />} />
                        <Route path="/units/:id/modifier" element={<UnitForm />} />

                        {/* Variantes (si page dédiée)  */}
                        <Route path="/variants" element={<Variants />} />
                        <Route path="/variants/nouveau" element={<VariantForm />} />
                        <Route path="/variants/:id/modifier" element={<VariantForm />} />




      
            </Route>
          </Routes>
        }
        />
    }
    </>
  )
}

export default App