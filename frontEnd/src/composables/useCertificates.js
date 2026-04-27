import { ref, computed, watch } from 'vue';
import { reportService } from '../services/reportService';
import { notify } from '../plugins/notify';

export function useCertificates() {
  const certificates = ref([]);
  const loading = ref(false);
  const searchQuery = ref('');
  const selectedContractor = ref('');
  const filterPlatform = ref('');
  const filterStatus = ref('');
  const filterDateStart = ref('');
  const filterDateEnd = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(5);

  const fetchCertificates = async () => {
    loading.value = true;
    try {
      const data = await reportService.getCertificates();
      const list = data.reports || data;
      certificates.value = list.map(item => ({
        id: item._id,
        persona: item.fullName || 'Sin nombre',
        date: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Sin fecha',
        name: (item.supervisor && item.supervisor.name) || item.supervisorName || 'S/N',
        cedula: item.documentNumber || '',
        initials: item.fullName
          ? item.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
          : '??',
        platform: item.platform
          ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1).replace(/_/g, ' ')
          : 'N/A',
        status: item.status === 'completed' ? 'Aprobado' : item.status === 'pending' ? 'Pendiente' : 'No aprobado',
        platformData: item.platformData || {}
      }));
    } catch (error) {
      console.error('Error fetching certificates:', error);
      certificates.value = [];
      notify('Error al cargar los reportes.', 'error');
    } finally {
      loading.value = false;
    }
  };

  const parseItemDate = (dateStr) => {
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const months = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        'ene.': 0, 'feb.': 1, 'mar.': 2, 'abr.': 3, 'may.': 4, 'jun.': 5,
        'jul.': 6, 'ago.': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'dic.': 11
      };
      const day = parseInt(parts[0]);
      const monthStr = parts[1].replace(',', '').toLowerCase();
      const month = months[monthStr];
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const filteredCertificates = computed(() => {
    let result = certificates.value;

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(item => 
        item.persona.toLowerCase().includes(q) || 
        item.cedula.toLowerCase().includes(q) || 
        item.platform.toLowerCase().includes(q)
      );
    }

    if (selectedContractor.value) {
      result = result.filter(item => item.name === selectedContractor.value);
    }

    if (filterPlatform.value) {
      result = result.filter(item => item.platform.toLowerCase() === filterPlatform.value.toLowerCase());
    }

    if (filterStatus.value) {
      result = result.filter(item => item.status === filterStatus.value);
    }

    if (filterDateStart.value || filterDateEnd.value) {
      const start = filterDateStart.value ? new Date(filterDateStart.value) : null;
      const end = filterDateEnd.value ? new Date(filterDateEnd.value) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      result = result.filter(item => {
        const itemDate = parseItemDate(item.date);
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    return result;
  });

  const totalPages = computed(() => Math.ceil(filteredCertificates.value.length / itemsPerPage.value));

  const paginatedCertificates = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredCertificates.value.slice(start, start + itemsPerPage.value);
  });

  const totalApproved = computed(() => filteredCertificates.value.filter(item => item.status === 'Aprobado').length);
  const totalPending = computed(() => filteredCertificates.value.filter(item => item.status !== 'Aprobado').length);

  const contractorNames = computed(() => [...new Set(certificates.value.map(item => item.name))]);

  watch([searchQuery, selectedContractor, filterPlatform, filterStatus, filterDateStart, filterDateEnd], () => {
    currentPage.value = 1;
  });

  return {
    certificates,
    loading,
    searchQuery,
    selectedContractor,
    filterPlatform,
    filterStatus,
    filterDateStart,
    filterDateEnd,
    currentPage,
    itemsPerPage,
    fetchCertificates,
    filteredCertificates,
    paginatedCertificates,
    totalPages,
    totalApproved,
    totalPending,
    contractorNames
  };
}
