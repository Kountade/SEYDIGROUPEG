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
import ProductPricingManager from './components/logistique/ProductPricingManager'
import Categories from './components/logistique/Categories'
import CategoryForm from './components/logistique/CategoryForm'
import Utilisateurs from './components/users/Utilisateurs'
import UtilisateurForm from './components/users/UtilisateurForm'
import UtilisateurDetail from './components/users/UtilisateurDetail'
import Fournisseurs from './components/achats/Fournisseurs'
import FournisseurForm from './components/achats/FournisseurForm'
import FournisseurDetail from './components/achats/FournisseurDetail'
import CommandesFournisseurs from './components/achats/CommandesFournisseurs'
import CommandeFournisseurForm from './components/achats/CommandeFournisseurForm'
import CommandeFournisseurDetail from './components/achats/CommandeFournisseurDetail'
import Receptions from './components/achats/Receptions'
import ReceptionForm from './components/achats/ReceptionForm'
import ReceptionDetail from './components/achats/ReceptionDetail'
import Positions from './components/grh/Positions'
import PositionForm from './components/grh/PositionForm'
import Departments from './components/grh/Departments'
import PositionDetail from './components/grh/PositionDetail'
import DepartmentForm from './components/grh/DepartmentForm'
import Employees from './components/grh/Employees'
import EmployeeForm from './components/grh/EmployeeForm'
import EmployeeDetail from './components/grh/EmployeeDetail'
import EmployeeQR from './components/grh/EmployeeQR'
import Leaves from './components/grh/Leaves'
import LeaveForm from './components/grh/LeaveForm'
import LeaveCalendar from './components/grh/LeaveCalendar'
import Payroll from './components/grh/Payroll'
import PayrollForm from './components/grh/PayrollForm'
import PayrollDetail from './components/grh/PositionDetail'
import PayrollSlip from './components/grh/PayrollSlip'
import Attendance from './components/grh/Attendance'
import AttendanceForm from './components/grh/AttendanceForm'
import Recruitments from './components/grh/Recruitments'
import RecruitmentForm from './components/grh/RecruitmentForm'
import Candidates from './components/grh/Candidates'
import HRStats from './components/grh/HRStats'
import Documents from './components/grh/Documents'
import PerformanceReviews from './components/grh/PerformanceReviews'
import ExpenseClaims from './components/grh/ExpenseClaims'
import Trainings from './components/grh/Trainings'
import Transferts from './components/inventaire/Transferts'
import TransfertForm from './components/inventaire/TransfertForm'
import TransfertDetail from './components/inventaire/TransfertDetail'
import Entrepots from './components/inventaire/entrepots'
import EntrepotDetail from './components/inventaire/EntrepotDetail'
import EntrepotForm from './components/inventaire/EntrepotForm'
import MouvementsStock from './components/inventaire/MouvementsStock'
import MouvementStockDetail from './components/inventaire/MouvementStockDetail'
import Stocks from './components/inventaire/Stocks'
import StockDetail from './components/inventaire/StockDetail'
import AddStockToWarehouse from './components/inventaire/AddStockToWarehouse'
import SalesDashboard from './components/ventes/SalesDashboard'
import ClientsList from './components/ventes/ClientsList'
import ClientForm from './components/ventes/ClientForm'
import ClientDetail from './components/ventes/ClientDetail'
import VentesList from './components/ventes/VentesList'
import VenteForm from './components/ventes/VenteForm'
import VenteDetail from './components/ventes/VenteDetail'
import FacturesList from './components/ventes/FacturesList'
import FactureForm from './components/ventes/FactureForm'
import FactureDetail from './components/ventes/FactureDetail' 
import TransfertPdf from './components/inventaire/TransfertPdf'





import AuditLog from './components/audit/AuditLog'




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
                        <Route path="/produits/:id/prix" element={<ProductPricingManager />} />
                        <Route path="/produits/:id/modifier" element={<ProductForm />} />
                      

  {/* Gestion des transfert */}

        <Route path="/transferts" element={<Transferts />} />
        <Route path="/transferts/nouveau" element={<TransfertForm />} />
        <Route path="/transferts/:id" element={<TransfertDetail />} />
        <Route path="/transferts/:id/pdf" element={<TransfertPdf />} />

 {/* Gestion des entrepot */}
<Route path="/entrepots" element={<Entrepots />} />
<Route path="/entrepots/:id" element={<EntrepotDetail />} />
<Route path="/entrepots/nouveau" element={<EntrepotForm />} />
<Route path="/entrepots/:id/modifier" element={<EntrepotForm />} />
{/* Gestion des MOUvements de stock */}
<Route path="/mouvements-stock" element={<MouvementsStock />} />
<Route path="/mouvements-stock/:id" element={<MouvementStockDetail />} />


 {/* Gestion des stock */}

 <Route path="/stocks/ajouter" element={<AddStockToWarehouse />} />
<Route path="/stocks" element={<Stocks />} />
<Route path="/stocks/:id" element={<StockDetail />} />

          {/* Gestion des UTILISATEURS */}
                        <Route path="/utilisateurs" element={<Utilisateurs />} />
                        <Route path="/utilisateurs/nouveau" element={<UtilisateurForm />} />
                        <Route path="/utilisateurs/:id/edit" element={<UtilisateurForm />} />
                        <Route path="/utilisateurs/:id" element={<UtilisateurDetail />} />
                          


                          
                       {/* Gestion des Fourniseurs */}
                      <Route path="/fournisseurs" element={<Fournisseurs />} />
                       <Route path="/fournisseurs/nouveau" element={<FournisseurForm />} />
                      <Route path="/fournisseurs/:id/edit" element={<FournisseurForm />} />
                      <Route path="/fournisseurs/:id" element={<FournisseurDetail />} />


  {/* Gestion des COMMADES */}
                      <Route path="/commandes-fournisseurs" element={<CommandesFournisseurs />} />
                      <Route path="/commandes-fournisseurs/nouveau" element={<CommandeFournisseurForm />} />
                      <Route path="/commandes-fournisseurs/:id/edit" element={<CommandeFournisseurForm />} />
                      <Route path="/commandes-fournisseurs/:id" element={<CommandeFournisseurDetail />} />

 {/* Gestion des RECEPTIOS */}
<Route path="/receptions" element={<Receptions />} />
<Route path="/receptions/nouveau" element={<ReceptionForm />} />
<Route path="/receptions/:id/edit" element={<ReceptionForm />} />
<Route path="/receptions/:id" element={<ReceptionDetail />} />

    {/* Departments */}
          <Route path="/departments" element={<Departments />} />
<Route path="/departments/new" element={<DepartmentForm />} />
<Route path="/departments/:id/edit" element={<DepartmentForm />} />


                       
<Route path="/positions" element={<Positions />} />
<Route path="/positions/new" element={<PositionForm />} />
<Route path="/positions/:id/edit" element={<PositionForm />} />
<Route path="/positions/:id" element={<PositionDetail />} />


  {/* EMPLOYES  */}
<Route path="/employees" element={<Employees />} />
<Route path="/employees/new" element={<EmployeeForm />} />
<Route path="/employees/:id/edit" element={<EmployeeForm />} />
<Route path="/employees/:id" element={<EmployeeDetail />} />
<Route path="/employees/:id/qr" element={<EmployeeQR />} />



        <Route path="/attendance" element={<Attendance />} />
<Route path="/attendance/checkin" element={<AttendanceForm />} />
<Route path="/attendance/checkout" element={<AttendanceForm />} />


 {/* Retours */}
 <Route path="/leaves" element={<Leaves />} />
        <Route path="/leaves/new" element={<LeaveForm />} />

        <Route path="/leaves/calendar" element={<LeaveCalendar />} />


   {/* PAIMET */}
   <Route path="/payroll" element={<Payroll />} />
        <Route path="/payroll/new" element={<PayrollForm />} />
        <Route path="/payroll/:id" element={<PayrollDetail />} />
        <Route path="/payroll/:id/edit" element={<PayrollForm />} />
        <Route path="/payroll/:id/slip" element={<PayrollSlip />} />



        // Routes
<Route path="/recruitments" element={<Recruitments />} />
<Route path="/recruitments/new" element={<RecruitmentForm />} />
<Route path="/recruitments/:id/edit" element={<RecruitmentForm />} />
<Route path="/candidates" element={<Candidates />} />
<Route path="/performance" element={<PerformanceReviews />} />
<Route path="/expenses" element={<ExpenseClaims />} />
<Route path="/documents" element={<Documents />} />
<Route path="/stats" element={<HRStats />} />
<Route path="/trainings" element={<Trainings />} />

                      <Route path="/dashboard/ventes" element={<SalesDashboard />} />
                      
<Route path="/clients" element={<ClientsList />} />
<Route path="/clients/nouveau" element={<ClientForm />} />
<Route path="/clients/:id" element={<ClientDetail />} />
<Route path="/clients/:id/modifier" element={<ClientForm />} />


<Route path="/ventes" element={<VentesList />} />
<Route path="/ventes/nouveau" element={<VenteForm />} />
<Route path="/ventes/:id" element={<VenteDetail />} />


          <Route path="/factures" element={<FacturesList />} />
          <Route path="/factures/nouveau" element={<FactureForm />} />
          <Route path="/factures/:id" element={<FactureDetail />} />
          <Route path="/factures/:id/modifier" element={<FactureForm />} />

 <Route path="/audit" element={<AuditLog />} />
            </Route>
          </Routes>
        }
        />
    }
    </>
  )
}

export default App