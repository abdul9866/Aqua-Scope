import { useEffect, useRef, useState } from 'react';
import {
  Waves,
  ArrowRight,
  Upload,
  ImagePlus,
  Trash2,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
  Sparkles,
  ScanSearch,
  Layers3,
  Eye,
  ShieldCheck,
  Leaf,
  FileImage,
  RefreshCw,
  Clock3,
  BarChart3,
  Gauge,
  SlidersHorizontal,
  Droplets,
  Printer,
  Fish,
  User,
  Smartphone,
  Lock,
} from 'lucide-react';
import './App.css';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import './components/authStyles.css';

const API_URL = 'http://127.0.0.1:8000';
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const workflow = [
  {
    number: '01',
    title: 'Introduction',
    description: 'Explore an underwater image with AI-assisted analysis.',
    icon: Waves,
    status: 'ready',
  },
  {
    number: '02',
    title: 'Image Enhancement',
    description: 'NSGA-Net (NU²Net) visibility, contrast, and color restoration.',
    icon: Sparkles,
    status: 'ready',
  },
  {
    number: '03',
    title: 'Pollution Detection',
    description: 'YOLOv8 underwater waste localization and class census.',
    icon: ScanSearch,
    status: 'ready',
  },
  {
    number: '04',
    title: 'Image Segmentation',
    description: 'YOLOv12 pixel-level debris boundary & contour segmentation.',
    icon: Layers3,
    status: 'ready',
  },
  {
    number: '05',
    title: 'Explainable AI',
    description: 'Grad-CAM & Eigen-CAM multi-scale attention heatmaps.',
    icon: Eye,
    status: 'ready',
  },
  {
    number: '06',
    title: 'Marine Risk Analytics',
    description: 'Pollution Severity Index (PSI), water quality & habitat impact.',
    icon: BarChart3,
    status: 'ready',
  },
];

function ImageCompareSlider({ beforeImage, afterImage, beforeLabel = 'Original', afterLabel = 'Enhanced' }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPos(percent);
  };

  return (
    <div
      className="slider-container"
      ref={containerRef}
      onMouseDown={() => { isDragging.current = true; }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
      onMouseMove={(e) => {
        if (isDragging.current || e.buttons === 1) handleMove(e.clientX);
      }}
      onTouchMove={(e) => {
        if (e.touches && e.touches[0]) handleMove(e.touches[0].clientX);
      }}
    >
      <img src={afterImage} alt={afterLabel} className="slider-img" />
      <div
        className="slider-img slider-overlay-img"
        style={{
          width: `${sliderPos}%`,
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
        }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="slider-img"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%', maxWidth: 'none' }}
        />
      </div>
      <span className="slider-badge-left">{beforeLabel}</span>
      <span className="slider-badge-right">{afterLabel}</span>
      <div className="slider-handle-line" style={{ left: `${sliderPos}%` }}>
        <div className="slider-handle-button" title="Drag to compare">↔</div>
      </div>
    </div>
  );
}

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [backendResult, setBackendResult] = useState(null);
  const [imageError, setImageError] = useState('');
  const [heatmapViewMode, setHeatmapViewMode] = useState('overlay'); // 'overlay' | 'raw'
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Authentication & Profile State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aquascope_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Progressive Web App (PWA) Mobile State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true)
    );
  });

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const getUserInitials = (name = 'Researcher') => {
    return name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    if (token) localStorage.setItem('aquascope_token', token);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    const token = localStorage.getItem('aquascope_token');
    if (token && !token.startsWith('demo_') && !token.startsWith('local_')) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('aquascope_user');
    localStorage.removeItem('aquascope_token');
    setCurrentUser(null);
    setIsProfileModalOpen(false);
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const handleHeaderInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install Aqua Scope Mobile App: use your browser menu or "Add to Home Screen" option.');
    }
  };

  useEffect(() => {
    return () => {
      if (selectedImage?.preview && selectedImage.preview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage.preview);
      }
    };
  }, [selectedImage]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError('Your image must be smaller than 15 MB.');
      event.target.value = '';
      return;
    }

    setSelectedImage({
      file,
      preview: URL.createObjectURL(file),
    });

    setBackendResult(null);
    setAnalysisStatus('idle');
  };

  const loadSampleImage = async (sampleUrl, filename) => {
    setImageError('');
    setAnalysisStatus('idle');
    setBackendResult(null);
    try {
      const response = await fetch(sampleUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      setSelectedImage({
        file,
        preview: URL.createObjectURL(file),
      });
    } catch {
      setImageError('Unable to load sample image. Please try uploading an image.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setBackendResult(null);
    setAnalysisStatus('idle');
    setImageError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!currentUser) {
      setAuthModalReason('Please sign in or create an account before analyzing the image.');
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedImage) {
      setImageError('Choose an underwater image before starting analysis.');
      return;
    }

    setAnalysisStatus('loading');
    setImageError('');
    setBackendResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage.file);

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || `Analysis failed with status ${response.status}.`
        );
      }

      setBackendResult(result);
      setAnalysisStatus('success');

      if (currentUser) {
        const newCount = (currentUser.analyses_count || 0) + 1;
        const updated = { ...currentUser, analyses_count: newCount };
        setCurrentUser(updated);
        localStorage.setItem('aquascope_user', JSON.stringify(updated));

        const token = localStorage.getItem('aquascope_token');
        if (token && !token.startsWith('demo_') && !token.startsWith('local_')) {
          fetch(`${API_URL}/auth/stats/increment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ stat_type: 'analyses' }),
          }).catch(() => {});
        }
      }

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    } catch (error) {
      setImageError(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to Aqua Scope. Make sure the FastAPI backend is running at http://127.0.0.1:8000.'
          : error.message || 'Something went wrong during analysis.'
      );
      setAnalysisStatus('error');
    }
  };

  const printReport = () => {
    if (currentUser) {
      const newCount = (currentUser.reports_count || 0) + 1;
      const updated = { ...currentUser, reports_count: newCount };
      setCurrentUser(updated);
      localStorage.setItem('aquascope_user', JSON.stringify(updated));

      const token = localStorage.getItem('aquascope_token');
      if (token && !token.startsWith('demo_') && !token.startsWith('local_')) {
        fetch(`${API_URL}/auth/stats/increment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stat_type: 'reports' }),
        }).catch(() => {});
      }
    }
    window.print();
  };

  const trashDetections = backendResult?.trash_detections || [];
  const nonTrashObjects = backendResult?.non_trash_objects || [];
  const analytics = backendResult?.analytics;

  const segmentationImage =
    backendResult?.segmentation_image ||
    backendResult?.segmented_image ||
    null;

  const segmentationStatus = backendResult?.segmentation_status;
  const segmentationError = backendResult?.segmentation_error;

  const segmentationSegments = Array.isArray(backendResult?.segments)
    ? backendResult.segments
    : [];

  const explainabilityHeatmap =
    heatmapViewMode === 'raw' && backendResult?.explainability_raw_heatmap
      ? backendResult.explainability_raw_heatmap
      : backendResult?.explainability_heatmap;

  const explainabilityMetrics = backendResult?.explainability_metrics;

  return (
    <div className="app-shell" id="home">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="Aqua Scope home">
          <span className="brand-icon">
            <Waves size={23} />
          </span>
          <span className="brand-text">
            <strong>
              Aqua<span>Scope</span>
            </strong>
            <small>UNDERWATER INTELLIGENCE</small>
          </span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#enhancement">Enhancement</a>
          <a href="#detection">Detection</a>
          <a href="#segmentation">Segmentation</a>
          <a href="#explainability">Grad-CAM XAI</a>
          <a href="#analytics">Environmental Risk</a>
        </nav>

        <div className="nav-actions-group">
          {!isStandalone && (
            <button
              type="button"
              className="pwa-header-install-btn"
              onClick={handleHeaderInstallClick}
              title="Install Mobile Application"
            >
              <Smartphone size={15} />
              <span>Install App</span>
            </button>
          )}

          <a
            href="#analyze"
            className="nav-button"
            onClick={(e) => {
              if (!currentUser) {
                e.preventDefault();
                setAuthModalReason('Please sign in or create an account before analyzing the image.');
                setIsAuthModalOpen(true);
              }
            }}
          >
            Analyze an image <ArrowRight size={16} />
          </a>

          {currentUser ? (
            <button
              type="button"
              className="profile-nav-trigger user-mode"
              onClick={() => setIsProfileModalOpen(true)}
              title="View Profile Details"
              aria-label="User profile details"
            >
              <div className="avatar-chip">
                {getUserInitials(currentUser.name)}
                <span className="online-pip" />
              </div>
              <span className="profile-nav-label">{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              className="profile-nav-trigger guest-mode"
              onClick={() => {
                setAuthModalReason('');
                setIsAuthModalOpen(true);
              }}
              title="Sign in or Sign up"
              aria-label="Sign in"
            >
              <User size={16} />
              <span className="profile-nav-label">Sign In</span>
            </button>
          )}
        </div>
      </header>

      <main>
        {/* 01 — INTRODUCTION */}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              CAPSTONE PROJECT · UNDERWATER AI RESEARCH
            </div>

            <h1>
              A clearer view
              <br />
              of the <span>underwater world.</span>
            </h1>

            <p className="hero-description">
              Integrated underwater vision system powered by <strong>NSGA-Net</strong> image enhancement, 
              <strong>YOLOv8</strong> object detection, <strong>YOLOv12</strong> pixel segmentation, 
              and <strong>Grad-CAM</strong> explainability heatmaps with Marine Severity Risk Indexing.
            </p>

            <div className="hero-actions">
              <a
                className="primary-button"
                href="#analyze"
                onClick={(e) => {
                  if (!currentUser) {
                    e.preventDefault();
                    setAuthModalReason('Please sign in or create an account before analyzing the image.');
                    setIsAuthModalOpen(true);
                  }
                }}
              >
                Start analysis <ArrowRight size={17} />
              </a>
              <a className="text-button" href="#workflow">
                Explore the 6 stages
              </a>
            </div>

            <div className="hero-note">
              <ShieldCheck size={17} />
              <span>NSGA-Net · YOLOv8 · YOLOv12 · Grad-CAM · Pollution Severity Index</span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-top">
              <span className="art-dot" />
              AQUA SCOPE / DEEP VISION CAPSTONE
            </div>

            <div className="ocean-illustration">
              <div className="ocean-ring ring-one" />
              <div className="ocean-ring ring-two" />
              <div className="ocean-center">
                <Waves size={88} strokeWidth={1.1} />
              </div>
              <span className="ocean-bubble bubble-one" />
              <span className="ocean-bubble bubble-two" />
              <span className="ocean-bubble bubble-three" />
            </div>

            <div className="art-bottom">
              <span>
                <span className="art-bottom-dot" />
                COMPUTER VISION & EXPLAINABLE AI
              </span>
              <span>01 — 06</span>
            </div>
          </div>
        </section>

        {/* WORKFLOW OVERVIEW */}
        <section className="workflow-section section-wrap" id="workflow">
          <div className="section-heading">
            <div>
              <span className="section-kicker">CAPSTONE ARCHITECTURE</span>
              <h2>Six integrated stages. One complete pipeline.</h2>
              <p>
                From optical enhancement to neural attention heatmaps and ecological impact scoring.
              </p>
            </div>
            <span className="workflow-count">06 STAGES</span>
          </div>

          <div className="workflow-list">
            {workflow.map((stage) => {
              const Icon = stage.icon;

              return (
                <a
                  className="workflow-item"
                  href={
                    stage.number === '01'
                      ? '#home'
                      : stage.number === '02'
                        ? '#enhancement'
                        : stage.number === '03'
                          ? '#detection'
                          : stage.number === '04'
                            ? '#segmentation'
                            : stage.number === '05'
                              ? '#explainability'
                              : '#analytics'
                  }
                  key={stage.number}
                >
                  <span className="workflow-number">{stage.number}</span>
                  <span className="workflow-icon">
                    <Icon size={21} />
                  </span>
                  <span className="workflow-copy">
                    <strong>{stage.title}</strong>
                    <small>{stage.description}</small>
                  </span>
                  <span className="stage-status status-ready">
                    Active & Connected
                  </span>
                  <ArrowRight className="workflow-arrow" size={17} />
                </a>
              );
            })}
          </div>
        </section>

        {/* IMAGE UPLOAD */}
        <section className="upload-section section-wrap" id="analyze">
          <div className="section-heading">
            <div>
              <span className="section-kicker">GET STARTED</span>
              <h2>Bring your underwater scene into focus.</h2>
              <p>
                Upload an underwater image or click a pre-loaded sample to test all models instantly.
              </p>
            </div>
          </div>

          <div className="upload-layout">
            <div className="upload-panel">
              <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                aria-label="Choose an underwater image"
              />

              {!selectedImage ? (
                <div className="empty-upload">
                  <div className="upload-icon">
                    <ImagePlus size={27} />
                  </div>
                  <h3>Select an underwater image</h3>
                  <p>
                    Choose a JPG, PNG, or try one of the curated test scenes below.
                  </p>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={17} /> Choose image
                  </button>
                  <span className="upload-limit">Maximum file size: 15 MB</span>

                  <div className="sample-picker">
                    <span className="sample-picker-label">Or Quick Test:</span>
                    <button
                      type="button"
                      className="sample-btn"
                      onClick={() => loadSampleImage('/samples/sample1.jpg', 'underwater_debris_sample.jpg')}
                    >
                      <Droplets size={14} /> Seabed Debris Scene
                    </button>
                    <button
                      type="button"
                      className="sample-btn"
                      onClick={() => loadSampleImage('/samples/sample2.jpg', 'underwater_habitat_sample.jpg')}
                    >
                      <Fish size={14} /> Marine Habitat Scene
                    </button>
                  </div>
                </div>
              ) : (
                <div className="selected-file">
                  <div className="selected-file-heading">
                    <div className="file-heading-icon">
                      <FileImage size={20} />
                    </div>
                    <div className="file-heading-copy">
                      <strong>Image selected</strong>
                      <small>Ready for multi-stage AI analysis</small>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={removeImage}
                      aria-label="Remove selected image"
                      title="Remove image"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <img
                    className="selected-preview"
                    src={selectedImage.preview}
                    alt="Selected underwater scene"
                  />

                  <div className="file-details">
                    <span className="file-name">{selectedImage.file.name}</span>
                    <span>
                      {(selectedImage.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <button
                    className="change-image-button"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={15} /> Choose a different image
                  </button>
                </div>
              )}

              {imageError && (
                <div className="message-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{imageError}</span>
                </div>
              )}

              {selectedImage && (
                !currentUser ? (
                  <button
                    className="primary-button analyze-button locked-btn"
                    type="button"
                    onClick={() => {
                      setAuthModalReason('Please sign in or create an account before analyzing the image.');
                      setIsAuthModalOpen(true);
                    }}
                  >
                    <Lock size={17} /> Sign In to Analyze Underwater Scene
                  </button>
                ) : (
                  <button
                    className="primary-button analyze-button"
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analysisStatus === 'loading'}
                  >
                    {analysisStatus === 'loading' ? (
                      <>
                        <LoaderCircle className="spin-icon" size={18} />
                        Processing NSGA-Net, YOLO & Grad-CAM...
                      </>
                    ) : (
                      <>
                        Run Full Pipeline Analysis <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                )
              )}

              {analysisStatus === 'loading' && (
                <div className="loading-note" role="status">
                  <Clock3 size={16} />
                  <span>
                    Executing optical enhancement, bounding box detection, mask segmentation, and Grad-CAM backpropagation.
                  </span>
                </div>
              )}
            </div>

            <aside className="analysis-info">
              <div className="info-icon">
                <ShieldCheck size={22} />
              </div>
              <h3>Capstone AI Architecture</h3>
              <p>
                Each image is processed through four deep learning models and an ecological analytics engine:
              </p>

              <div className="info-divider" />

              <div className="info-step">
                <span className="info-step-number">01</span>
                <div>
                  <strong>Enhancement</strong>
                  <small>NSGA-Net (NU²Net) recovers attenuated color spectrum.</small>
                </div>
              </div>

              <div className="info-step">
                <span className="info-step-number">02</span>
                <div>
                  <strong>Detection</strong>
                  <small>YOLOv8 detects pollution & marine species.</small>
                </div>
              </div>

              <div className="info-step">
                <span className="info-step-number">03</span>
                <div>
                  <strong>Segmentation</strong>
                  <small>YOLOv12 segments exact pixel contours.</small>
                </div>
              </div>

              <div className="info-step">
                <span className="info-step-number">04</span>
                <div>
                  <strong>Explainability</strong>
                  <small>Grad-CAM & Eigen-CAM multi-scale heatmaps.</small>
                </div>
              </div>

              <div className="info-step">
                <span className="info-step-number">05</span>
                <div>
                  <strong>Census & PSI</strong>
                  <small>Total object count & Pollution Severity Index.</small>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* RESULTS */}
        {analysisStatus === 'success' && backendResult && (
          <section className="results-section section-wrap" ref={resultsRef}>
            <div className="section-heading">
              <div>
                <span className="section-kicker">INSPECTION DOSSIER</span>
                <h2>Comprehensive Capstone Results</h2>
                <p>
                  Multi-stage outputs from NSGA-Net enhancement, YOLOv8 detection, YOLOv12 segmentation, and Grad-CAM explainability.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="report-btn"
                  onClick={printReport}
                  title="Print or export PDF dossier"
                >
                  <Printer size={16} /> Export Report / Print
                </button>
                <span className="success-pill">
                  <CheckCircle2 size={15} /> All 6 Stages Complete
                </span>
              </div>
            </div>

            {/* EXECUTIVE METRIC CARDS (FEATURE 1, 2, 3) */}
            {analytics && (
              <div className="metrics-overview-grid">
                {/* Metric 1: Total Object Count */}
                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-card-icon teal">
                      <BarChart3 size={20} />
                    </div>
                    <span className="metric-badge blue">Object Census</span>
                  </div>
                  <div className="metric-value">{analytics.census.total_objects}</div>
                  <div className="metric-title">Total Objects in Image</div>
                  <div className="metric-subtext">
                    <strong>{analytics.census.trash_count}</strong> pollution items ·{' '}
                    <strong>{analytics.census.marine_life_count}</strong> marine fauna/flora.
                    <br />
                    Dominant: <strong>{analytics.census.dominant_category}</strong>
                  </div>
                </div>

                {/* Metric 2: Pollution Severity Index (PSI) */}
                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className={`metric-card-icon ${analytics.severity.color}`}>
                      <Gauge size={20} />
                    </div>
                    <span className={`metric-badge ${analytics.severity.color}`}>
                      {analytics.severity.level}
                    </span>
                  </div>
                  <div className="metric-value">{analytics.severity.score}<small style={{ fontSize: '18px', fontWeight: 500 }}>/100</small></div>
                  <div className="metric-title">Pollution Severity Index (PSI)</div>
                  <div className="psi-bar-wrap">
                    <div
                      className="psi-bar-fill"
                      style={{
                        width: `${analytics.severity.score}%`,
                        backgroundColor:
                          analytics.severity.color === 'emerald'
                            ? '#10b981'
                            : analytics.severity.color === 'blue'
                              ? '#0284c7'
                              : analytics.severity.color === 'amber'
                                ? '#f59e0b'
                                : analytics.severity.color === 'orange'
                                  ? '#f97316'
                                  : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="psi-scale-labels">
                    <span>Clean (0)</span>
                    <span>Severe (75)</span>
                    <span>Critical (100)</span>
                  </div>
                </div>

                {/* Metric 3: Debris Coverage */}
                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-card-icon red">
                      <Layers3 size={20} />
                    </div>
                    <span className="metric-badge red">Area Coverage</span>
                  </div>
                  <div className="metric-value">{analytics.coverage.debris_coverage_pct}%</div>
                  <div className="metric-title">Debris Surface Area</div>
                  <div className="metric-subtext">
                    <strong>{analytics.coverage.clean_habitat_pct}%</strong> clean habitat preserved across frame.
                  </div>
                </div>

                {/* Metric 4: Water Clarity Gain */}
                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-card-icon emerald">
                      <Sparkles size={20} />
                    </div>
                    <span className="metric-badge emerald">NSGA-Net Gain</span>
                  </div>
                  <div className="metric-value">+{analytics.water_quality.contrast_gain_pct}%</div>
                  <div className="metric-title">Underwater Contrast Gain</div>
                  <div className="metric-subtext">
                    Sharpness boost: +{analytics.water_quality.sharpness_gain_pct}% · Turbidity mitigation: {analytics.water_quality.turbidity_mitigation}
                  </div>
                </div>
              </div>
            )}

            {/* 02 — ENHANCEMENT */}
            <section className="result-stage" id="enhancement">
              <div className="result-stage-heading">
                <span className="result-stage-number">02</span>
                <div>
                  <span className="section-kicker">IMAGE ENHANCEMENT · NSGA-NET (NU²NET)</span>
                  <h3>Optical Enhancement & Color Restoration</h3>
                  <p>
                    Slide to interactively compare the raw underwater input with the NSGA-Net enhanced output.
                  </p>
                </div>
              </div>

              {/* Interactive Comparison Slider */}
              <ImageCompareSlider
                beforeImage={backendResult.original_image}
                afterImage={backendResult.enhanced_image}
                beforeLabel="Original Underwater Image"
                afterLabel="NSGA-Net Enhanced Image"
              />

              <div className="image-comparison" style={{ marginTop: '20px' }}>
                <ImageResult
                  title="Original image"
                  subtitle="Raw captured underwater input"
                  src={backendResult.original_image}
                />
                <ImageResult
                  title="Enhanced image"
                  subtitle="NSGA-Net (NU²Net) output"
                  src={backendResult.enhanced_image}
                />
              </div>

              <div className="result-caption">
                <Sparkles size={16} />
                NSGA-Net addresses wavelength attenuation and scattering, recovering high-frequency detail for detection.
              </div>
            </section>

            {/* 03 — POLLUTION DETECTION */}
            <section className="result-stage" id="detection">
              <div className="result-stage-heading">
                <span className="result-stage-number">03</span>
                <div>
                  <span className="section-kicker">POLLUTION DETECTION · YOLOV8</span>
                  <h3>Debris Localization & Classification</h3>
                  <p>
                    YOLOv8 bounding boxes displayed over the raw image and aligned with the enhanced view.
                  </p>
                </div>
              </div>

              <div className="image-comparison">
                <ImageResult
                  title="Trash detection"
                  subtitle="Original image with YOLOv8 bounding boxes"
                  src={backendResult.original_detection_image}
                />
                <ImageResult
                  title="Detection on enhanced view"
                  subtitle="Enhanced image with synchronized bounding boxes"
                  src={backendResult.enhanced_detection_image}
                />
              </div>

              <div className="detection-summary">
                <div className="summary-stat">
                  <span className="summary-label">Trash detections</span>
                  <strong>{trashDetections.length}</strong>
                  <small>
                    {trashDetections.length === 1
                      ? 'pollution object identified'
                      : 'pollution objects identified'}
                  </small>
                </div>

                <div className="summary-stat">
                  <span className="summary-label">Other object classes</span>
                  <strong>{nonTrashObjects.length}</strong>
                  <small>marine fauna / flora identified</small>
                </div>

                <div className="summary-stat summary-message">
                  <span className="summary-label">Model status</span>
                  <strong>
                    {trashDetections.length > 0
                      ? 'Pollution Confirmed'
                      : 'Clean Environment'}
                  </strong>
                  <small>
                    Detection threshold: 0.10 confidence across 22 TrashCan classes.
                  </small>
                </div>
              </div>

              <div className="detection-list-panel">
                <div className="detection-list-heading">
                  <h4>Detected Trash Objects</h4>
                  <span>{trashDetections.length} results</span>
                </div>

                {trashDetections.length > 0 ? (
                  <div className="detection-list">
                    {trashDetections.map((item, index) => (
                      <div
                        className="detection-row"
                        key={`${item.class_name}-${index}`}
                      >
                        <span className="detection-index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="detection-object">
                          <strong>{formatClassName(item.class_name)}</strong>
                          <small>
                            Coordinates: [{item.box?.join(', ') || 'Available'}]
                          </small>
                        </div>
                        <span className="confidence-value">
                          {(item.confidence * 100).toFixed(1)}%
                          <small>confidence</small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-detections">
                    <ScanSearch size={22} />
                    <strong>No trash objects were detected.</strong>
                    <p>
                      No anthropogenic debris met the detection threshold in this frame.
                    </p>
                  </div>
                )}
              </div>

              {nonTrashObjects.length > 0 && (
                <div className="other-objects">
                  <strong>Marine Fauna / Flora Detected</strong>
                  <div className="object-tags">
                    {nonTrashObjects.map((name) => (
                      <span className="object-tag" key={name}>
                        {formatClassName(name)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 04 — SEGMENTATION */}
            <section className="result-stage" id="segmentation">
              <div className="result-stage-heading">
                <span className="result-stage-number">04</span>
                <div>
                  <span className="section-kicker">IMAGE SEGMENTATION · YOLOV12</span>
                  <h3>Pixel-Level Boundary Segmentation</h3>
                  <p>
                    YOLOv12 segmentation masks delineating exact contour boundaries and surface area.
                  </p>
                </div>
              </div>

              {segmentationImage ? (
                <>
                  <div className="segmentation-result">
                    <ImageResult
                      title="Pixel-level debris segmentation"
                      subtitle="YOLOv12 multi-class segmentation mask overlay"
                      src={segmentationImage}
                    />
                  </div>

                  {segmentationSegments.length > 0 && (
                    <div className="segmentation-details">
                      <strong>Segmented Debris Instances</strong>
                      <div className="object-tags">
                        {segmentationSegments.map((segment, index) => {
                          const name =
                            typeof segment === 'string'
                              ? segment
                              : segment.class_name ||
                                segment.label ||
                                segment.name ||
                                segment.class ||
                                `Segment ${index + 1}`;

                          return (
                            <span
                              className="object-tag"
                              key={`${name}-${index}`}
                            >
                              {formatClassName(name)}
                              {typeof segment.confidence === 'number'
                                ? ` · ${(segment.confidence * 100).toFixed(1)}%`
                                : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="result-caption">
                    <Layers3 size={16} />
                    Segmentation masks isolate contaminated regions for accurate surface area coverage calculations.
                  </div>
                </>
              ) : (
                <div className="empty-detections">
                  <Layers3 size={22} />
                  <strong>
                    {segmentationStatus === 'skipped_no_trash_detected'
                      ? 'Segmentation skipped — No trash detected in frame'
                      : segmentationStatus === 'failed'
                        ? segmentationError || 'Segmentation model reported an error'
                        : 'No segmentation mask returned'}
                  </strong>
                  <p>
                    Segmentation executes conditionally when pollution targets are identified by the detection stage.
                  </p>
                </div>
              )}
            </section>

            {/* 05 — EXPLAINABILITY (GRAD-CAM) */}
            <section className="result-stage" id="explainability">
              <div className="result-stage-heading">
                <span className="result-stage-number">05</span>
                <div>
                  <span className="section-kicker">EXPLAINABLE AI · GRAD-CAM & EIGEN-CAM</span>
                  <h3>Model Attention & Saliency Heatmaps</h3>
                  <p>
                    Visual explanation revealing the neural network activation patterns across deep feature layers.
                  </p>
                </div>
              </div>

              {explainabilityHeatmap ? (
                <>
                  <div className="heatmap-mode-tabs">
                    <button
                      type="button"
                      className={`heatmap-tab-btn ${heatmapViewMode === 'overlay' ? 'active' : ''}`}
                      onClick={() => setHeatmapViewMode('overlay')}
                    >
                      <Eye size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      Grad-CAM Heatmap Overlay
                    </button>
                    {backendResult.explainability_raw_heatmap && (
                      <button
                        type="button"
                        className={`heatmap-tab-btn ${heatmapViewMode === 'raw' ? 'active' : ''}`}
                        onClick={() => setHeatmapViewMode('raw')}
                      >
                        <SlidersHorizontal size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        Pure Jet Colormap Heatmap
                      </button>
                    )}
                  </div>

                  <div className="segmentation-result">
                    <ImageResult
                      title={heatmapViewMode === 'overlay' ? 'Grad-CAM Attention Overlay' : 'Raw Jet Activation Heatmap'}
                      subtitle="Probing multi-scale C2f & SPPF neck layers (15, 18, 21)"
                      src={explainabilityHeatmap}
                    />
                  </div>

                  <div className="jet-colormap-bar">
                    <span className="colormap-label">Background / Cool (0%)</span>
                    <div className="jet-gradient" />
                    <span className="colormap-label">High Attention / Peak (100%)</span>
                  </div>

                  {explainabilityMetrics && (
                    <div className="detection-summary" style={{ marginTop: '16px' }}>
                      <div className="summary-stat">
                        <span className="summary-label">XAI Methodology</span>
                        <strong style={{ fontSize: '15px' }}>{explainabilityMetrics.method}</strong>
                        <small>{explainabilityMetrics.target_layers}</small>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">Peak Attention Score</span>
                        <strong>{explainabilityMetrics.peak_intensity}%</strong>
                        <small>Max normalized saliency</small>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">High-Attention Coverage</span>
                        <strong>{explainabilityMetrics.high_attention_coverage_pct}%</strong>
                        <small>Pixels with &gt;60% model salience</small>
                      </div>
                    </div>
                  )}

                  <div className="result-caption">
                    <Eye size={16} />
                    Warm regions (red/yellow) indicate where the deep convolutional filters identified high-salience features corresponding to anthropogenic debris.
                  </div>
                </>
              ) : (
                <div className="empty-detections">
                  <Eye size={22} />
                  <strong>Explainability heatmap unavailable.</strong>
                  <p>{backendResult?.explainability_error || 'Check backend explainability status.'}</p>
                </div>
              )}
            </section>

            {/* 06 — ENVIRONMENTAL RISK & OBJECT CENSUS (NEW FEATURES) */}
            {analytics && (
              <section className="result-stage" id="analytics">
                <div className="result-stage-heading">
                  <span className="result-stage-number">06</span>
                  <div>
                    <span className="section-kicker">CAPSTONE ANALYTICS</span>
                    <h3>Object Census & Environmental Risk Assessment</h3>
                    <p>
                      Breakdown of detected marine objects, sizes, and ecological action recommendations.
                    </p>
                  </div>
                </div>

                <div className="census-breakdown-grid">
                  {/* Category Breakdown Card */}
                  <div className="breakdown-card">
                    <h4>
                      <span>Category Distribution</span>
                      <small style={{ color: 'var(--muted)', fontWeight: 500 }}>
                        {analytics.census.total_objects} total
                      </small>
                    </h4>

                    {analytics.census.category_breakdown.map((cat) => (
                      <div className="progress-row" key={cat.name}>
                        <div className="progress-row-header">
                          <span>
                            <strong>{cat.display_name}</strong>{' '}
                            <small style={{ color: cat.is_trash ? '#f43f5e' : '#0284c7' }}>
                              ({cat.is_trash ? 'Pollution' : 'Marine Fauna'})
                            </small>
                          </span>
                          <span>{cat.count} ({cat.percentage}%)</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className={`progress-fill ${cat.is_trash ? 'trash' : 'marine'}`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Size & Ecology Card */}
                  <div className="breakdown-card">
                    <h4>
                      <span>Debris Size Distribution</span>
                      <small style={{ color: 'var(--muted)', fontWeight: 500 }}>Spatial footprint</small>
                    </h4>

                    <div className="progress-row">
                      <div className="progress-row-header">
                        <span>Small Debris (&lt;2% area)</span>
                        <span>{analytics.census.size_distribution.small}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill trash"
                          style={{
                            width: `${analytics.census.trash_count ? (analytics.census.size_distribution.small / analytics.census.trash_count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="progress-row">
                      <div className="progress-row-header">
                        <span>Medium Debris (2%–10% area)</span>
                        <span>{analytics.census.size_distribution.medium}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill trash"
                          style={{
                            width: `${analytics.census.trash_count ? (analytics.census.size_distribution.medium / analytics.census.trash_count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="progress-row">
                      <div className="progress-row-header">
                        <span>Large Debris (&gt;10% area)</span>
                        <span>{analytics.census.size_distribution.large}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill trash"
                          style={{
                            width: `${analytics.census.trash_count ? (analytics.census.size_distribution.large / analytics.census.trash_count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', padding: '14px', background: 'var(--surface-soft)', borderRadius: '10px' }}>
                      <strong style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--teal-dark)' }}>
                        Ecological Action Recommendation:
                      </strong>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5 }}>
                        {analytics.severity.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                {analytics.severity.flagged_hazards.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '16px', background: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                    <strong style={{ display: 'block', color: '#991b1b', marginBottom: '8px' }}>
                      Flagged Critical Environmental Threats:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7f1d1d', lineHeight: 1.6 }}>
                      {analytics.severity.flagged_hazards.map((hazard) => (
                        <li key={hazard.type}>
                          <strong>{hazard.type}:</strong> {hazard.impact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </section>
        )}

        {/* FUTURE FEATURES WHEN THERE ARE NO RESULTS */}
        {analysisStatus !== 'success' && (
          <section className="future-overview section-wrap">
            <div className="future-overview-heading">
              <div>
                <span className="section-kicker">CAPSTONE PROJECT ARCHITECTURE</span>
                <h2>End-to-end underwater image intelligence.</h2>
              </div>
              <Leaf size={27} />
            </div>

            <div className="future-overview-grid">
              <article className="future-overview-card" id="segmentation-preview">
                <Layers3 size={22} />
                <span>04</span>
                <h3>Image Segmentation</h3>
                <p>
                  YOLOv12 generates pixel-level boundary masks for precise debris area quantification.
                </p>
                <small style={{ color: 'var(--teal)' }}>YOLOv12 Active</small>
              </article>

              <article className="future-overview-card" id="explainability-preview">
                <Eye size={22} />
                <span>05</span>
                <h3>Grad-CAM Explainable AI</h3>
                <p>
                  Multi-scale gradient and Eigen-CAM attention heatmaps revealing neural network salience.
                </p>
                <small style={{ color: 'var(--teal)' }}>Grad-CAM Active</small>
              </article>

              <article className="future-overview-card" id="analytics-preview">
                <BarChart3 size={22} />
                <span>06</span>
                <h3>Pollution Severity & Census</h3>
                <p>
                  Total object count, category distribution, and standardized Pollution Severity Index (PSI).
                </p>
                <small style={{ color: 'var(--teal)' }}>Analytics Active</small>
              </article>
            </div>
          </section>
        )}

        <section className="about-section section-wrap" id="about">
          <div className="about-icon">
            <Waves size={25} />
          </div>
          <div>
            <span className="section-kicker">ABOUT AQUA SCOPE CAPSTONE</span>
            <h2>Technology for automated marine debris monitoring.</h2>
            <p>
              Aqua Scope is a capstone underwater computer vision research system combining 
              NSGA-Net (NU²Net) optical enhancement, YOLOv8 object detection, YOLOv12 instance segmentation, 
              and Grad-CAM explainable AI to automate ocean pollution assessment and support marine habitat preservation.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">
            <Waves size={20} />
          </span>
          <span className="brand-text">
            <strong>
              Aqua<span>Scope</span>
            </strong>
            <small>UNDERWATER INTELLIGENCE · CAPSTONE</small>
          </span>
        </a>
        <p>Aqua Scope · NSGA-Net + YOLOv8 + YOLOv12 + Grad-CAM + Pollution Severity Index</p>
        <a href="#home" className="back-to-top">
          Back to top ↑
        </a>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        reason={authModalReason}
        apiUrl={API_URL}
      />

      {/* Profile Details Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
        apiUrl={API_URL}
      />

      {/* Progressive Web App Mobile Install Prompt */}
      <PwaInstallPrompt
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setDeferredPrompt(null)}
      />
    </div>
  );
}

function ImageResult({ title, subtitle, src }) {
  return (
    <article className="image-result-card">
      <div className="image-result-heading">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <ImagePlus size={18} />
      </div>
      {src ? (
        <img src={src} alt={title} className="result-image" />
      ) : (
        <div className="missing-image">
          <AlertCircle size={20} />
          <span>Image result is unavailable.</span>
        </div>
      )}
    </article>
  );
}

function formatClassName(name = '') {
  return name
    .replace(/^trash_/, '')
    .replace(/^animal_/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default App;
