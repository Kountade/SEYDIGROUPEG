// src/components/sales/DevisPDF.js
import AxiosInstance from '../AxiosInstance';

const DevisPDF = async (devis) => {
  try {
    const response = await AxiosInstance.get(`/devis/${devis.id}/pdf/`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `devis_${devis.reference}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    throw error;
  }
};

export default DevisPDF;