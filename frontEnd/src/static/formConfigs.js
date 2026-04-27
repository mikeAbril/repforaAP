// Opciones para SOI (Con código)
const epsOptionsSOI = [
  'NO APORTA A SALUD',
  'CCFC20 - SUBS COMFACHOCO',
  'CCFC33 - EPS FAMILIAR DE COLOMBIA SAS',
  'CCFC50 - SUBS COMFAORIENTE',
  'CCFC55 - CAJACOPI EPS S.A.S',
  'EAS016 - EMPRESAS PUBLICAS DE MEDELLIN',
  'EAS027 - FONDO DE PASIVO SOCIAL DE FERROCARRILES',
  'EPS001-ALIANSALUD EPS SA.',
  'EPS002 - SALUD TOTAL',
  'EPS005 - SANITAS S.A.',
  'EPS008 - COMPENSAR',
  'EPS010 - SURAMERICANA DE SERVICIOS DE SALUD',
  'EPS012 - COMFENALCO VALLE E.P.S',
  'EPS017 - FAMISANAR',
  'EPS018 - S.O.S. E.P.S',
  'EPS035 - REDSALUD',
  'EPS037 - NUEVA E.P.S',
  'EPS040 - SAVIA SALUD EPS',
  'EPS041- NUEVA EPS CM',
  'EPS042 - COOSALUD ESS',
  'EPS046-SALUD MIA EPS',
  'EPS047 - SALUD BOLIVAR EPS',
  'EPSC25 - SUBS CAPRESOCA EPS',
  'EPSC34 - SUBS CAPITAL SALUD EPSS',
  'EPSC49 - FUNDACIÓN SALUD MÍA EPS',
  'EPSIC1 - SUBS DUSAKAWI',
  'EPSIC3 - SUBS ASOC. INDIG. DEL CAUCA A.I.C',
  'EPSIC4 - SUBS ANAS WAYUU EPS',
  'EPSIC5 - SUBS MALLAMAS EPSI',
  'EPSIC6 - SUBS PIJAOSALUD EPSI',
  'ESSC07 - SUBS ASOC. MUT. SER EMPRESA SOL. ESS',
  'ESSC18 - EMSSANAR S.A.S.',
  'ESSC24 - SUBS COOSALUD ESS',
  'ESSC62-ASMET SALUD EPS',
  'MIN001 - ADRES',
  'MIN002 - ADRES - RÉGIMEN EXCEPCIÓN',
  'MIN004 - ADRES - CONTRIBUCIÓN SOLIDARIA',
  'MUTUAL SER EPS-S',
  'RES005-UNIVERSIDAD DEL ATLANTICO',
  'RES006-UNIVERSIDAD INDUSTRIAL DE SANTANDER',
  'RES007-UNIVERSIDAD DEL VALLE',
  'RES008-UNIVERSIDAD NACIONAL DE COLOMBIA',
  'RES009-UNIVERSIDAD DE CAUCA',
  'RES010-UNIVERSIDAD DE CARTAGENA',
  'RES011-UNIVERSIONAL DE ANTIOQUIA',
  'RES012-UNIVERSIDAD DE CORDOBA',
  'RES013-UNIVERSIDAD DE NARIÑO',
  'RES014-UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA – UPTC'
];

// Opciones para las demás plataformas (Solo nombres)
const epsOptionsPure = [
  'NO APORTA A SALUD',
  'COMFACHOCO',
  'FAMILIAR DE COLOMBIA',
  'COMFAORIENTE',
  'CAJACOPI EPS',
  'EMPRESAS PUBLICAS DE MEDELLIN',
  'FONDO DE PASIVO SOCIAL DE FERROCARRILES',
  'ALIANSALUD EPS',
  'SALUD TOTAL',
  'SANITAS',
  'COMPENSAR',
  'SURAMERICANA DE SERVICIOS DE SALUD',
  'COMFENALCO VALLE',
  'FAMISANAR',
  'S.O.S. E.P.S',
  'REDSALUD',
  'NUEVA E.P.S',
  'SAVIA SALUD EPS',
  'NUEVA EPS CM',
  'COOSALUD ESS',
  'SALUD MIA EPS',
  'SALUD BOLIVAR EPS',
  'CAPRESOCA EPS',
  'CAPITAL SALUD EPSS',
  'FUNDACIÓN SALUD MÍA EPS',
  'DUSAKAWI',
  'ASOC. INDIG. DEL CAUCA A.I.C',
  'ANAS WAYUU EPS',
  'MALLAMAS EPSI',
  'PIJAOSALUD EPSI',
  'ASOC. MUT. SER EMPRESA SOL. ESS',
  'EMSSANAR',
  'ASMET SALUD EPS',
  'ADRES',
  'ADRES - RÉGIMEN EXCEPCIÓN',
  'ADRES - CONTRIBUCIÓN SOLIDARIA',
  'MUTUAL SER EPS-S'
];

export const formConfigs = {
  soi: {
    title: 'Consulta de Planilla - SOI',
    subtitle: 'Ingrese la información requerida para consultar el estado de sus aportes en SOI.',
    color: 'green-1',
    sections: [
      {
        title: 'Información del cotizante',
        icon: 'person',
        fields: [
          { 
            name: 'documentType', 
            label: 'Tipo de documento', 
            type: 'select', 
            options: [
              { label: 'Cédula de ciudadanía', value: 'CC' },
              { label: 'Carné diplomático', value: 'CD' },
              { label: 'Cédula de extranjería', value: 'CE' },
              { label: 'Pasaporte', value: 'PA' },
              { label: 'Permiso especial permanencia', value: 'PE' },
              { label: 'Permiso por protección temporal', value: 'PT' },
              { label: 'REGISTRO CIVIL', value: 'RC' },
              { label: 'Salvo conducto', value: 'SC' },
              { label: 'Tarjeta de identidad', value: 'TI' }
            ], 
            col: 6 
          },
          { name: 'documentNumber', label: 'No. de documento', type: 'input', isNumber: true, col: 6 },
          { name: 'fullName', label: 'Nombre Completo', type: 'input', col: 12 },
          { 
            name: 'eps', 
            label: 'EPS', 
            type: 'select', 
            options: epsOptionsSOI, 
            col: 12 
          },
          { name: 'mes', label: 'Mes', type: 'select', options: 'meses', col: 6 },
          { name: 'anio', label: 'Año', type: 'select', options: 'anios', col: 6 }
        ]
      },

      {
        title: 'Asignación de Supervisor',
        icon: 'supervised_user_circle',
        fields: [
          { 
            name: 'supervisorId', 
            label: 'Seleccione su Supervisor', 
            type: 'select', 
            options: 'supervisors', 
            col: 12 
          },
        ]
      }
    ]
  },
  asopagos: {
    title: 'Consulta de Planilla - ASOPAGOS',
    subtitle: 'Obtenga su certificado de aportes a través de la plataforma Asopagos.',
    color: 'blue-1',
    sections: [
      {
        title: 'Información del cotizante',
        icon: 'person',
        fields: [
          { 
            name: 'documentType', 
            label: 'Tipo de documento', 
            type: 'select', 
            options: [
              { label: 'Cédula de Ciudadanía', value: 'CC' },
              { label: 'Carné Diplomático', value: 'CD' },
              { label: 'Cédula de Extranjería', value: 'CE' },
              { label: 'Tarjeta de Identidad', value: 'TI' },
              { label: 'Registro Civil', value: 'RC' },
              { label: 'Salvo conducto de permanencia', value: 'SC' },
              { label: 'Pasaporte', value: 'PA' },
              { label: 'Permiso Especial', value: 'PE' },
              { label: 'Permiso por Protección Temporal', value: 'PT' }
            ], 
            col: 6 
          },
          { name: 'documentNumber', label: 'No. de documento', type: 'input', isNumber: true, col: 6 },
          { name: 'fullName', label: 'Nombre Completo', type: 'input', col: 12 },
          { name: 'eps', label: 'EPS', type: 'select', options: epsOptionsPure, allowNewValue: true, col: 12 },
          { name: 'mes', label: 'Mes', type: 'select', options: 'meses', col: 6 },
          { name: 'anio', label: 'Año', type: 'select', options: 'anios', col: 6 }
        ]
      },

      {
        title: 'Asignación de Supervisor',
        icon: 'supervised_user_circle',
        fields: [
          { 
            name: 'supervisorId', 
            label: 'Seleccione su Supervisor', 
            type: 'select', 
            options: 'supervisors', 
            col: 12 
          },
        ]
      }
    ]
  },
  mi_planilla: {
    title: 'Consulta de Planilla - COMPENSAR (Mi Planilla)',
    subtitle: 'Acceda a sus certificados a través del operador Mi Planilla / Compensar.',
    color: 'orange-1',
    sections: [
      {
        title: 'Información del cotizante',
        icon: 'person',
        fields: [
          { 
            name: 'documentType', 
            label: 'Tipo de documento', 
            type: 'select', 
            options: [
              { label: 'Cédula Ciudadanía', value: 'CC' },
              { label: 'Cédula de extranjería', value: 'CE' },
              { label: 'Tarjeta de Identidad', value: 'TI' },
              { label: 'Registro Civil', value: 'RC' },
              { label: 'Pasaporte', value: 'PA' },
              { label: 'Carnet Diplomático', value: 'CD' }
            ], 
            col: 6 
          },
          { name: 'documentNumber', label: 'No. de documento', type: 'input', isNumber: true, col: 6 },
          { name: 'fullName', label: 'Nombre Completo', type: 'input', col: 12 },
          { name: 'eps', label: 'EPS', type: 'select', options: epsOptionsPure, allowNewValue: true, col: 12 },
          { name: 'mes', label: 'Periodo (Mes)', type: 'select', options: 'meses', col: 6 },
          { name: 'anio', label: 'Periodo (Año)', type: 'select', options: 'anios', col: 6 }
        ]
      },
      {
        title: 'Datos de la Planilla',
        icon: 'receipt_long',
        fields: [
          { name: 'numeroPlanilla', label: 'Número de Planilla', type: 'input', isNumber: true, col: 6 },
          { name: 'valorPagado', label: 'Valor Total Pagado ($)', type: 'input', isNumber: true, col: 6 },
          { name: 'fechaPagoDia', label: 'Día de Pago', type: 'select', options: 'dias', col: 4 },
          { name: 'fechaPagoMes', label: 'Mes de Pago', type: 'select', options: 'mesesNombres', col: 4 },
          { name: 'fechaPagoAnio', label: 'Año de Pago', type: 'select', options: 'anios', col: 4 }
        ]
      },

      {
        title: 'Asignación de Supervisor',
        icon: 'supervised_user_circle',
        fields: [
          { 
            name: 'supervisorId', 
            label: 'Seleccione su Supervisor', 
            type: 'select', 
            options: 'supervisors', 
            col: 12 
          },
        ]
      }
    ]
  },
  aportes_en_linea: {
    title: 'Consulta de Planilla - APORTES EN LÍNEA',
    subtitle: 'Consulte sus aportes de seguridad social en la plataforma de Aportes en Línea.',
    color: 'red-1',
    sections: [
      {
        title: 'Información del cotizante',
        icon: 'person',
        fields: [
          { 
            name: 'documentType', 
            label: 'Tipo de documento', 
            type: 'select', 
            options: [
              { label: 'Cédula de ciudadanía', value: 'CC' },
              { label: 'Cédula de extranjería', value: 'CE' },
              { label: 'Tarjeta de identidad', value: 'TI' },
              { label: 'Pasaporte', value: 'PA' }
            ], 
            col: 6 
          },
          { name: 'documentNumber', label: 'No. de documento', type: 'input', isNumber: true, col: 6 },
          { name: 'fullName', label: 'Nombre Completo', type: 'input', col: 12 },
          { name: 'fechaExpedicion', label: 'Fecha de Expedición (AAAA/MM/DD)', type: 'input', mask: '####/##/##', col: 12 },
          { name: 'eps', label: 'EPS', type: 'select', options: epsOptionsPure, allowNewValue: true, col: 12 },
          { name: 'mes', label: 'Mes Periodo', type: 'select', options: 'meses', col: 6 },
          { name: 'anio', label: 'Año Periodo', type: 'select', options: 'anios', col: 6 }
        ]
      },

      {
        title: 'Asignación de Supervisor',
        icon: 'supervised_user_circle',
        fields: [
          { 
            name: 'supervisorId', 
            label: 'Seleccione su Supervisor', 
            type: 'select', 
            options: 'supervisors', 
            col: 12 
          },
        ]
      }
    ]
  }
};

export const mesesOptions = [
  { label: 'Enero', value: '1' },
  { label: 'Febrero', value: '2' },
  { label: 'Marzo', value: '3' },
  { label: 'Abril', value: '4' },
  { label: 'Mayo', value: '5' },
  { label: 'Junio', value: '6' },
  { label: 'Julio', value: '7' },
  { label: 'Agosto', value: '8' },
  { label: 'Septiembre', value: '9' },
  { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' },
  { label: 'Diciembre', value: '12' }
];

export const mesesNombresOptions = [
  { label: 'Enero', value: 'Enero' },
  { label: 'Febrero', value: 'Febrero' },
  { label: 'Marzo', value: 'Marzo' },
  { label: 'Abril', value: 'Abril' },
  { label: 'Mayo', value: 'Mayo' },
  { label: 'Junio', value: 'Junio' },
  { label: 'Julio', value: 'Julio' },
  { label: 'Agosto', value: 'Agosto' },
  { label: 'Septiembre', value: 'Septiembre' },
  { label: 'Octubre', value: 'Octubre' },
  { label: 'Noviembre', value: 'Noviembre' },
  { label: 'Diciembre', value: 'Diciembre' }
];

export const aniosOptions = ['2023', '2024', '2025', '2026'];

export const diasOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));
