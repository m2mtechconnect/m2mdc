/**
 * Français québécois (fr-CA) — Traduction complète du Studio M2M AURA
 * Terminologie conforme à l'OQLF et adaptée au contexte québécois
 */

const frCA = {
  // Global
  global: {
    productName: 'M2M Studio Agentique',
    twinSuffix: 'Jumeau numérique souverain de centre de données IA vert',
    actions: {
      simulate: 'Simuler',
      forecast: 'Prévoir',
      optimize: 'Optimiser',
      enforce: 'Appliquer',
      model: 'Modéliser',
      quantify: 'Quantifier',
      evaluate: 'Évaluer',
      predict: 'Prédire',
    },
  },

  // Navigation
  nav: {
    overview: 'Aperçu',
    blueprint: 'Plan directeur',
    simulation: 'Simulation',
    agents: 'Agents',
    workflows: 'Flux de travail',
    deploy: 'Déploiement',
    integrations: 'Intégrations',
    compliance: 'Conformité',
    teams: 'Équipes',
    marketplace: 'Marché',
    help: 'Aide',
    settings: 'Paramètres',
    search: 'Recherche',
    dashboard: 'Tableau de bord',
    intelligence: 'Intelligence',
    builder: 'Configurateur',
    infrastructure: 'Infrastructure',
  },

  // Authentification
  auth: {
    login: 'Connexion',
    signUp: 'Créer un compte',
    signOut: 'Déconnexion',
    forgotPassword: 'Mot de passe oublié',
    email: 'Courriel',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    resetPassword: 'Réinitialiser le mot de passe',
    sendResetLink: 'Envoyer le lien de réinitialisation',
    createAccount: 'Créer un compte',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    dontHaveAccount: "Vous n'avez pas de compte?",
    welcomeBack: 'Content de vous revoir',
    getStarted: 'Commencer',
    loginSubtitle: 'Connectez-vous à votre jumeau de centre de données',
    signUpSubtitle: 'Créez votre jumeau numérique souverain de centre de données IA vert',
  },

  // Page d'accueil
  landing: {
    heroTitle: 'Jumeau numérique souverain de centre de données IA',
    heroSubtitle: "Simulez les résultats énergétiques, carboniques, de souveraineté et de capacité GPU pour des opérations d'infrastructure durables et conformes.",
    getStarted: 'Commencer',
    learnMore: 'En savoir plus',
    features: 'Fonctionnalités',
    useCases: "Cas d'utilisation",
    integrations: 'Intégrations',
    whyM2M: 'Pourquoi M2M',
    solutions: 'Solutions',
    product: 'Produit',
    company: 'Entreprise',
    resources: 'Ressources',
    legal: 'Juridique',
    enterpriseSolutions: "Solutions d'entreprise",
    enterpriseDesc: 'Pour les DI, DT et opérations de centres de données',
    sustainability: 'Développement durable',
    sustainabilityDesc: 'Suivi du carbone et rapports ESG',
    clientLogin: 'Connexion client',
    aboutM2M: 'À propos de M2M Tech',
    ourTeam: 'Notre équipe',
    contactUs: 'Nous joindre',
    careers: 'Carrières',
    blog: 'Blogue',
    caseStudies: 'Études de cas',
    documentation: 'Documentation',
    support: 'Soutien technique',
    privacyPolicy: 'Politique de confidentialité',
    termsOfService: "Conditions d'utilisation",
    security: 'Sécurité',
    copyright: '© {{year}} M2M Tech Connect Inc. Tous droits réservés.',
    carbonNeutral: 'Carboneutre',
    madeInCanada: 'Fait au Canada',
    footerDescription: "Jumeaux numériques souverains de centres de données IA pour des opérations d'infrastructure durables et conformes.",
  },

  // Onglet Aperçu
  overview: {
    title: 'Commande du centre de données',
    subtitle: 'Opérations souveraines de centre de données IA vert',
    purposeStatement: "Simulez les résultats énergétiques, carboniques, de souveraineté et de capacité GPU pour le centre de données sélectionné. Indicateurs en direct pour l'EEE, l'intensité carbone, le mix renouvelable et le calcul souverain.",
    businessImpact: "Quantifiez les économies d'énergie, la réduction du carbone, la conformité souveraine et les améliorations d'utilisation GPU sous différentes conditions opérationnelles ou réglementaires.",
    keyMetrics: {
      roiImpact: 'Impact RCI projeté',
      efficiencyGain: 'Gain d\'efficacité opérationnelle',
      greenEnergy: 'Part d\'énergie verte',
      computeCapacity: 'Capacité de calcul nominale',
    },
    quickActions: {
      runSimulation: 'Lancer la simulation',
      viewBlueprint: 'Voir le plan directeur',
      manageAgents: 'Gérer les agents de sous-système',
      reviewKPIs: 'Consulter le tableau de bord des IRC',
    },
    emptyState: {
      noTwin: "Aucun jumeau de centre de données sélectionné. Analysez un site Web ou créez un nouveau jumeau pour commencer.",
      noData: "En attente de télémétrie. Connectez les sources de données pour alimenter les mesures en direct.",
    },
  },

  // Onglet Plan directeur
  blueprint: {
    title: 'Plan directeur',
    subtitle: 'Configuration système faisant autorité',
    intro: "Modèle structurel complet des domaines, agents, IRC, flux de travail, scénarios et règles de souveraineté. Définit la configuration faisant autorité utilisée pour toutes les simulations.",
    sections: {
      domains: 'Architecture de domaines',
      agents: 'Agents de sous-système',
      kpis: 'Indicateurs de rendement clés',
      workflows: 'Flux de travail automatisés',
      scenarios: 'Scénarios de simulation',
      dataSources: 'Intégrations de données',
    },
    actions: {
      downloadJSON: 'Télécharger le plan JSON',
      exportAudit: "Exporter pour l'audit",
      viewChangelog: "Voir l'historique des modifications",
    },
  },

  // Domaines
  domains: {
    thermal: { name: 'Thermique et matériel', description: "Modélise les conditions thermiques des serveurs, le flux d'air des baies, la capacité de refroidissement et l'évacuation de la chaleur." },
    power: { name: 'Alimentation et ASI', description: "Suit la charge des UDP, l'état de l'ASI, le basculement sur groupe électrogène et la redondance électrique." },
    cooling: { name: 'Systèmes de refroidissement', description: "Surveille les unités CRAH/CRAC, la performance des refroidisseurs et l'efficacité des fluides frigorigènes." },
    network: { name: 'Infrastructure réseau', description: "Mesure le débit des commutateurs, la latence, la perte de paquets et la capacité du pare-feu." },
    facility: { name: 'Installation et sécurité', description: "Suit les conditions ambiantes, l'extinction d'incendie, la détection d'eau et la sécurité physique." },
    workload: { name: 'Charge de travail et GPU', description: "Planifie les tâches GPU, équilibre l'entraînement et l'inférence, et optimise les temps d'attente." },
    sovereignty: { name: 'Souveraineté et conformité', description: "Suit la résidence des données, les flux transfrontaliers, l'application des politiques et les seuils réglementaires." },
    financial: { name: 'Finance et carbone', description: "Modélise les coûts énergétiques, l'exposition carbone, la part de renouvelable et les trajectoires financières." },
  },

  // Agents
  agents: {
    sectionIntro: "Les agents autonomes surveillent les domaines, détectent les anomalies et déclenchent des réponses automatisées. Chaque agent est lié à des IRC et des flux de travail spécifiques pour maintenir la stabilité opérationnelle.",
    items: {
      'thermal-guardian': { name: 'Gardien thermique', summary: "Prédit la dérive thermique et déclenche des ajustements de refroidissement avant que les seuils de limitation soient atteints." },
      'power-monitor': { name: "Moniteur d'alimentation et ASI", summary: "Suit la distribution électrique, l'état des batteries et la disponibilité du basculement pour assurer des opérations ininterrompues." },
      'cooling-optimizer': { name: "Agent d'optimisation du refroidissement", summary: "Prédit les inefficacités de refroidissement et ajuste le flux d'air et l'utilisation des refroidisseurs pour maintenir la stabilité thermique lors de pics de charge." },
      'network-sentinel': { name: 'Sentinelle réseau', summary: "Surveille la saturation des commutateurs, les pics de latence et la perte de paquets pour maintenir la fiabilité du réseau." },
      'facility-guardian': { name: "Gardien de l'installation", summary: "Détecte les anomalies environnementales, les risques d'incendie et les intrusions d'eau pour protéger l'infrastructure physique." },
      'workload-orchestrator': { name: 'Orchestrateur de charge', summary: "Équilibre les charges GPU entre les baies, optimise les temps d'attente et prévient la contention de ressources." },
      'sovereignty-sentinel': { name: 'Sentinelle de souveraineté', summary: "Détecte les flux de données transfrontaliers et applique les contraintes régionales de traitement des données." },
      'carbon-optimizer': { name: 'Optimiseur carbone et coûts', summary: "Prévoit les émissions et l'exposition aux coûts en fonction de la charge, du mix énergétique et de la pénétration des renouvelables." },
      'incident-response': { name: "Agent de réponse aux incidents", summary: "Coordonne les réponses automatisées aux alertes critiques dans les domaines thermique, électrique et de souveraineté." },
    },
  },

  // IRC (KPIs)
  kpis: {
    sectionIntro: "Les indicateurs de rendement clés valident les seuils énergétiques, carboniques, de souveraineté et opérationnels. Chaque IRC définit des cibles, des alertes et une responsabilité du propriétaire.",
    items: {
      'effective-ai-pue': { name: 'EEE IA effectif', description: "Mesure l'efficacité énergétique de l'infrastructure informatique et des installations." },
      'gco2-per-gpu-hour': { name: 'Intensité carbone', description: "Suit les émissions par unité de calcul; essentiel pour la modélisation de bâtiments verts." },
      'sovereign-compute-ratio': { name: 'Ratio de calcul souverain', description: "Indique le pourcentage de calcul traité dans les limites souveraines." },
      'renewable-share': { name: "Part d'énergie renouvelable", description: "Mesure la proportion d'énergie provenant de sources renouvelables." },
      'uptime': { name: 'Disponibilité du système', description: "Critique pour évaluer la fiabilité opérationnelle et la conformité aux ENS." },
      'gpu-utilization': { name: 'Utilisation du parc GPU', description: "Mesure l'efficacité de calcul du parc GPU." },
      'thermal-stability': { name: 'Indice de stabilité thermique', description: "Utilisé pour valider les seuils thermiques et l'efficacité du refroidissement." },
      'power-redundancy': { name: "Niveau de redondance électrique", description: "Indique la capacité de basculement et la résilience de l'infrastructure électrique." },
      'cooling-efficiency': { name: 'Efficacité du refroidissement', description: "Mesure l'efficacité du système de refroidissement par rapport à la charge thermique." },
      'carbon-cost-exposure': { name: 'Exposition aux coûts carbone', description: "Quantifie le risque financier lié à la tarification du carbone et aux changements réglementaires." },
    },
  },

  // Flux de travail
  workflows: {
    sectionIntro: "Contrôles opérationnels automatisés pour la réponse thermique, l'orchestration GPU, la stabilité électrique et l'application de la souveraineté.",
    items: {
      'thermal-response': { name: 'Flux de réponse thermique', description: "Déclenche des ajustements de refroidissement lorsque la température des baies dépasse les seuils." },
      'gpu-orchestration': { name: "Flux d'orchestration GPU", description: "Équilibre les charges d'entraînement et d'inférence sur la capacité GPU disponible." },
      'power-failover': { name: 'Flux de basculement électrique', description: "Lance le basculement ASI et groupe électrogène lors d'anomalies électriques." },
      'sovereignty-enforcement': { name: "Flux d'application de la souveraineté", description: "Bloque ou redirige les flux de données qui violent les politiques de résidence." },
      'carbon-optimization': { name: "Flux d'optimisation carbone", description: "Déplace les charges vers les périodes de mix énergétique renouvelable plus élevé." },
    },
  },

  // Scénarios
  scenarios: {
    sectionIntro: "Testez la résilience opérationnelle, prévoyez les résultats énergétiques et carboniques, et quantifiez l'impact financier sous diverses conditions.",
    items: {
      'gpu-spike': { name: 'Pic de charge GPU', description: "Simulez des hausses rapides de charge GPU et observez la dérive thermique, le risque de limitation et l'impact carbone." },
      'cooling-failure': { name: 'Panne du système de refroidissement', description: "Modélisez une perte soudaine de refroidissement et prédisez les cascades de pannes à travers les baies et les charges." },
      'carbon-price-shock': { name: 'Choc du prix du carbone', description: "Quantifiez l'exposition aux coûts opérationnels lors d'une hausse abrupte du prix du carbone." },
      'grid-instability': { name: 'Instabilité du réseau', description: "Évaluez la résilience lors de fluctuations de renouvelables ou de conditions de baisse de tension." },
      'sovereignty-breach': { name: 'Tentative de violation de souveraineté', description: "Testez la détection et la réponse au routage transfrontalier non autorisé de données." },
      'thermal-runaway': { name: 'Emballement thermique', description: "Modélisez les défaillances thermiques en cascade à partir d'une brèche de confinement d'allée chaude." },
      'power-outage': { name: 'Panne de courant prolongée', description: "Simulez une panne prolongée du réseau et évaluez l'endurance de l'ASI et du groupe électrogène." },
      'network-saturation': { name: 'Saturation du réseau', description: "Testez la résilience du réseau sous des charges de trafic extrêmes et des conditions DDoS." },
    },
  },

  // Onglet Simulation
  simulation: {
    title: 'Simulation de scénarios',
    subtitle: "Tests de résistance et modélisation d'impact",
    intro: "Exécutez des tests de résistance, modélisez les cascades de pannes, prévoyez les résultats énergétiques/carboniques et quantifiez l'impact financier et de souveraineté.",
    controls: {
      run: 'Lancer la simulation',
      pause: 'Pause',
      resume: 'Reprendre',
      reset: 'Réinitialiser',
      speed: 'Vitesse de lecture',
    },
    status: {
      ready: 'Prêt à simuler',
      running: 'Simulation en cours',
      paused: 'Simulation en pause',
      completed: 'Simulation terminée',
      failed: 'Simulation échouée',
    },
  },

  // Analyseur
  scanner: {
    title: 'Analyseur de jumeau de centre de données vert',
    placeholder: 'Entrez l\'adresse du site Web à analyser...',
    scanning: "Analyse du site Web pour détecter l'industrie, la mission et les signaux de développement durable...",
    actions: {
      createTwin: 'Créer le jumeau',
      customize: 'Personnaliser dans le configurateur',
      rescan: 'Réanalyser le site Web',
    },
    detected: {
      industry: 'Industrie détectée',
      capacity: 'Capacité recommandée',
      tier: 'Niveau d\'infrastructure',
      profile: 'Profil du plan directeur',
    },
  },

  // Configurateur
  builder: {
    steps: {
      step1: { name: "Profil d'entreprise", title: 'Configuration du jumeau de centre de données', description: "Définissez l'emplacement, la capacité et les objectifs de développement durable de l'installation." },
      step2: { name: 'Capacités', title: 'Configuration du plan directeur', description: "Configurez les seuils des IRC et activez les agents de sous-système." },
      step3: { name: 'IA et intégrations', title: 'Intégrations', description: "Définissez le modèle d'intelligence et connectez les sources de données." },
      step4: { name: 'Scénarios et flux', title: 'Flux de travail et scénarios', description: "Activez les scénarios de simulation et les flux de travail automatisés." },
      step5: { name: 'Déploiement et finances', title: 'Configuration du déploiement', description: "Sélectionnez la région infonuagique et configurez le modèle financier." },
    },
    actions: {
      saveDraft: 'Enregistrer le brouillon',
      deploy: 'Déployer le jumeau',
      preview: 'Aperçu de la configuration',
    },
  },

  // Copilote
  copilot: {
    title: 'Copilote du centre de données',
    placeholder: "Posez une question sur l'EEE, le refroidissement, la saturation GPU, le carbone ou la souveraineté...",
    quickActions: {
      explainKPI: 'Expliquer cet IRC',
      suggestAgent: 'Suggérer un agent',
      analyzeTrend: 'Analyser cette tendance',
      recommendScenario: 'Recommander un scénario',
    },
  },

  // Boutons et communs
  buttons: {
    create: 'Créer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    download: 'Télécharger',
    export: 'Exporter',
    import: 'Importer',
    refresh: 'Actualiser',
    close: 'Fermer',
    apply: 'Appliquer',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Suivant',
    finish: 'Terminer',
  },

  // Infobulles
  tooltips: {
    pue: "Efficacité énergétique effective — ratio de la puissance totale de l'installation par rapport à la puissance de l'équipement TI. Plus bas est mieux.",
    carbonIntensity: "Grammes de CO₂ émis par heure-GPU de calcul. Critique pour les rapports de développement durable.",
    sovereignCompute: "Pourcentage des charges de calcul traitées dans les limites souveraines des données.",
    renewableShare: "Proportion d'énergie provenant de sources renouvelables (solaire, éolien, hydroélectrique).",
    simulationSnapshot: "Les simulations s'exécutent sur un instantané figé du plan directeur pour assurer la reproductibilité.",
  },

  // Industries
  industries: {
    finance: { name: 'Services financiers', twinIntro: "Optimisez l'infrastructure de négociation, assurez la conformité réglementaire et modélisez l'exposition carbone pour les opérations financières." },
    government: { name: 'Gouvernement et secteur public', twinIntro: "Appliquez la souveraineté des données, assurez la conformité réglementaire et optimisez la consommation d'énergie pour les opérations du secteur public." },
    retail: { name: 'Commerce de détail et commerce en ligne', twinIntro: "Optimisez le calcul périphérique, l'énergie de la chaîne du froid et la souveraineté de la chaîne d'approvisionnement pour les opérations de vente au détail." },
    telecom: { name: 'Télécommunications', twinIntro: "Modélisez l'infrastructure réseau, optimisez les déploiements périphériques et assurez la disponibilité des services." },
    cloud_saas: { name: 'Infonuagique et SaaS', twinIntro: "Optimisez l'infrastructure multi-locataire, modélisez les scénarios de mise à l'échelle et minimisez l'empreinte carbone." },
    manufacturing: { name: 'Fabrication et industriel', twinIntro: "Intégrez les systèmes TI/TO, optimisez le calcul industriel et assurez la continuité opérationnelle." },
    healthcare: { name: 'Santé et sciences de la vie', twinIntro: "Assurez la conformité HIPAA, protégez la souveraineté des données patients et optimisez le calcul de recherche." },
    energy: { name: 'Énergie et services publics', twinIntro: "Modélisez l'intégration au réseau, optimisez la consommation de renouvelables et prévoyez les trajectoires carbone." },
    ai_compute: { name: 'IA et calcul haute performance', twinIntro: "Optimisez l'utilisation du parc GPU, modélisez les charges d'entraînement et minimisez le carbone par cycle de calcul." },
    other: { name: 'Entreprise générale', twinIntro: "Optimisez les opérations du centre de données, modélisez les résultats de développement durable et assurez la résilience opérationnelle." },
  },

  // États vides
  emptyStates: {
    noAgents: "Aucun agent configuré. Ajoutez des agents de sous-système pour activer les opérations automatisées.",
    noKPIs: "Aucun IRC activé. Configurez les IRC pour suivre la performance opérationnelle.",
    noWorkflows: "Aucun flux de travail actif. Activez les flux de travail pour automatiser les réponses aux événements.",
    noScenarios: "Aucun scénario défini. Ajoutez des scénarios pour tester votre jumeau sous contrainte.",
    noData: "En attente de données. Connectez les sources de télémétrie pour alimenter les mesures.",
    noResults: "Aucun résultat de simulation. Lancez un scénario pour générer des données de performance.",
  },

  // Sélecteur de langue
  language: {
    label: 'Langue',
    en: 'English',
    'fr-CA': 'Français (Québec)',
  },
};

export default frCA;
