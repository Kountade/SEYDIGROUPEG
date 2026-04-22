// src/components/UtilisateurForm.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Mail,
  User,
  Calendar,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AxiosInstance from './AxiosInstance';

const UtilisateurForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const isGerant = currentUser?.role === 'gerant';

  const roleOptions = [
    { value: 'gerant', label: 'Gérant / Titulaire', description: 'Accès complet' },
    { value: 'pharmacien', label: 'Pharmacien', description: 'Validation ordonnances, gestion stocks' },
    { value: 'preparateur', label: 'Préparateur', description: 'Vente, préparation commandes' }
  ];

  // Schéma de validation
  const schema = yup.object({
    email: yup.string()
      .email('Email invalide')
      .required('L\'email est requis'),
    username: yup.string()
      .required('Le nom d\'utilisateur est requis')
      .min(3, 'Minimum 3 caractères')
      .max(50, 'Maximum 50 caractères'),
    role: yup.string()
      .required('Le rôle est requis')
      .oneOf(['gerant', 'pharmacien', 'preparateur'], 'Rôle invalide'),
    birthday: yup.date()
      .nullable()
      .transform((curr, orig) => orig === '' ? null : curr)
      .typeError('Date invalide (format YYYY-MM-DD)'),
    ...(isEdit ? {} : {
      password: yup.string()
        .required('Le mot de passe est requis')
        .min(8, 'Minimum 8 caractères')
        .matches(/[A-Z]/, 'Au moins une majuscule')
        .matches(/[a-z]/, 'Au moins une minuscule')
        .matches(/[0-9]/, 'Au moins un chiffre'),
      password2: yup.string()
        .required('Confirmation requise')
        .oneOf([yup.ref('password'), null], 'Les mots de passe ne correspondent pas')
    })
  });

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      username: '',
      role: 'preparateur',
      birthday: '',
      password: '',
      password2: ''
    }
  });

  const selectedRole = watch('role');
  const password = watch('password');

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const userData = localStorage.getItem('User');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Erreur parsing utilisateur:', error);
      }
    }
  }, []);

  // Charger les données en mode édition
  useEffect(() => {
    const fetchUser = async () => {
      if (id) {
        try {
          const response = await AxiosInstance.get(`/users/${id}/`);
          const user = response.data;
          
          let formattedBirthday = '';
          if (user.birthday) {
            const date = new Date(user.birthday);
            if (!isNaN(date.getTime())) {
              formattedBirthday = date.toISOString().split('T')[0];
            }
          }
          
          reset({
            email: user.email || '',
            username: user.username || '',
            role: user.role || 'preparateur',
            birthday: formattedBirthday
          });
        } catch (error) {
          console.error('Erreur chargement utilisateur:', error);
          setError('Impossible de charger l\'utilisateur');
        } finally {
          setInitialLoading(false);
        }
      }
    };
    
    if (isEdit) {
      fetchUser();
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const payload = { ...data };
      delete payload.password2;
      
      if (payload.birthday === '' || !payload.birthday) {
        payload.birthday = null;
      }
      
      if (isEdit) {
        if (!payload.password || payload.password === '') {
          delete payload.password;
        }
        await AxiosInstance.patch(`/users/${id}/`, payload);
      } else {
        await AxiosInstance.post('/register/', payload);
      }
      
      navigate('/utilisateurs');
    } catch (error) {
      console.error('Erreur formulaire:', error);
      
      if (error.response?.data) {
        const errors = error.response.data;
        const firstError = Object.values(errors)[0];
        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        
        if (errors.birthday) {
          setError('Format de date invalide. Utilisez le format YYYY-MM-DD');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canSelectGerant = isGerant || (isEdit && currentUser?.id === parseInt(id));

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] w-full">
        <div className="loading loading-spinner loading-lg text-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 w-full">
      {/* Fil d'Ariane */}
      <div className="mb-4 md:mb-5">
        <Link 
          to="/utilisateurs" 
          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          Retour à la liste
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <User className="h-6 w-6 md:h-7 md:w-7 text-emerald-600" />
          {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {isEdit ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}
        </p>
      </div>

      {/* Carte formulaire - pleine largeur */}
      <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 md:px-6 py-3 md:py-4">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            Informations du compte
          </h2>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6">
          {error && (
            <div className="alert alert-error mb-4 md:mb-6 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Grille responsive - 1 colonne mobile, 2 colonnes md, 3 colonnes lg */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {/* Email - pleine largeur sur mobile, normal sur desktop */}
            <div className="form-control md:col-span-2 lg:col-span-1">
              <label className="label py-0.5 md:py-1">
                <span className="label-text font-medium text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                  Email professionnel
                </span>
              </label>
              <input
                type="email"
                {...register('email')}
                className={`input input-bordered w-full input-sm md:input-md ${errors.email ? 'input-error' : ''}`}
                placeholder="prenom.nom@pharmacie.fr"
                disabled={loading}
              />
              {errors.email && (
                <label className="label py-0.5">
                  <span className="label-text-alt text-error text-xs">{errors.email.message}</span>
                </label>
              )}
            </div>

            {/* Nom d'utilisateur */}
            <div className="form-control">
              <label className="label py-0.5 md:py-1">
                <span className="label-text font-medium text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                  Nom d'utilisateur
                </span>
              </label>
              <input
                type="text"
                {...register('username')}
                className={`input input-bordered w-full input-sm md:input-md ${errors.username ? 'input-error' : ''}`}
                placeholder="prenom.nom"
                disabled={loading}
              />
              {errors.username && (
                <label className="label py-0.5">
                  <span className="label-text-alt text-error text-xs">{errors.username.message}</span>
                </label>
              )}
            </div>

            {/* Date de naissance */}
            <div className="form-control">
              <label className="label py-0.5 md:py-1">
                <span className="label-text font-medium text-sm flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                  Date de naissance
                </span>
                <span className="label-text-alt text-gray-400 text-xs">YYYY-MM-DD</span>
              </label>
              <input
                type="date"
                {...register('birthday')}
                className={`input input-bordered w-full input-sm md:input-md ${errors.birthday ? 'input-error' : ''}`}
                disabled={loading}
                placeholder="YYYY-MM-DD"
              />
              {errors.birthday && (
                <label className="label py-0.5">
                  <span className="label-text-alt text-error text-xs">{errors.birthday.message}</span>
                </label>
              )}
            </div>

            {/* Mot de passe (création) - 2 colonnes */}
            {!isEdit ? (
              <>
                <div className="form-control">
                  <label className="label py-0.5 md:py-1">
                    <span className="label-text font-medium text-sm flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                      Mot de passe
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className={`input input-bordered w-full pr-10 input-sm md:input-md ${errors.password ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex="-1"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <label className="label py-0.5">
                      <span className="label-text-alt text-error text-xs">{errors.password.message}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label py-0.5 md:py-1">
                    <span className="label-text font-medium text-sm flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                      Confirmation
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('password2')}
                      className={`input input-bordered w-full pr-10 input-sm md:input-md ${errors.password2 ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                    </button>
                  </div>
                  {errors.password2 && (
                    <label className="label py-0.5">
                      <span className="label-text-alt text-error text-xs">{errors.password2.message}</span>
                    </label>
                  )}
                </div>
              </>
            ) : (
              /* Option changement mot de passe (édition) */
              <div className="form-control md:col-span-2 lg:col-span-1">
                <label className="label py-0.5 md:py-1">
                  <span className="label-text font-medium text-sm flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                    Changer le mot de passe
                  </span>
                  <span className="label-text-alt text-gray-400 text-xs">Optionnel</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="input input-bordered w-full pr-10 input-sm md:input-md"
                    placeholder="Laisser vide pour ne pas changer"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Force du mot de passe */}
          {password && !isEdit && (
            <div className="mt-4 md:mt-5">
              <PasswordStrengthIndicator password={password} />
            </div>
          )}

          {/* Rôle */}
          <div className="form-control mt-4 md:mt-5">
            <label className="label py-0.5 md:py-1">
              <span className="label-text font-medium text-sm flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                Rôle
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              {roleOptions.map((role) => {
                const isDisabled = role.value === 'gerant' && !canSelectGerant;
                
                return (
                  <label
                    key={role.value}
                    className={`
                      flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedRole === role.value 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-200'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="radio"
                      value={role.value}
                      {...register('role')}
                      disabled={loading || isDisabled}
                      className="radio radio-emerald mt-0.5 radio-sm md:radio-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-xs md:text-sm">{role.label}</div>
                      <div className="text-xs text-gray-500 truncate">{role.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.role && (
              <label className="label py-0.5">
                <span className="label-text-alt text-error text-xs">{errors.role.message}</span>
              </label>
            )}
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2 md:gap-3 mt-6 md:mt-8 pt-4 md:pt-5 border-t border-gray-100">
            <Link
              to="/utilisateurs"
              className="btn btn-outline btn-sm md:btn-md"
            >
              Annuler
            </Link>
            <button
              type="submit"
              className="btn bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-0 hover:from-emerald-700 hover:to-teal-800 shadow-md btn-sm md:btn-md min-w-28 md:min-w-32"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                  <span className="hidden sm:inline">Enregistrement...</span>
                  <span className="sm:hidden">Chargement...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {isEdit ? 'Mettre à jour' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Indicateur force mot de passe
const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":;{}|<>+]/.test(password)) strength++;
    return strength;
  };

  const strength = getStrength();
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
  const strengthTextColors = ['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-emerald-600'];

  const criteria = [
    { valid: password.length >= 8, text: '8 caractères minimum' },
    { valid: /[A-Z]/.test(password), text: 'Une majuscule' },
    { valid: /[a-z]/.test(password), text: 'Une minuscule' },
    { valid: /[0-9]/.test(password), text: 'Un chiffre' }
  ];

  return (
    <div className="w-full bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200">
      <div className="flex gap-1 h-1.5 mb-2 md:mb-3">
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-all ${
              level < strength ? strengthColors[strength - 1] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strengthTextColors[strength - 1] || 'text-gray-500'} mb-2`}>
        Force : {strengthLabels[strength - 1] || 'Très faible'}
      </p>
      <div className="grid grid-cols-2 gap-x-2 md:gap-x-3 gap-y-1">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center gap-1 md:gap-1.5">
            {criterion.valid ? (
              <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-xs ${criterion.valid ? 'text-gray-600' : 'text-gray-400'}`}>
              {criterion.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UtilisateurForm;