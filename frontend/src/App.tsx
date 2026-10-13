import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { AuthModal } from './components/AuthModal.js';
import { CheckoutModal } from './components/CheckoutModal.js';
import { ToastContainer, ToastMessage } from './components/Toast.js';
import { LandingPage } from './pages/LandingPage.js';
import { BrowsePage } from './pages/BrowsePage.js';
import { ItemDetailsPage } from './pages/ItemDetailsPage.js';
import { AddListingPage } from './pages/AddListingPage.js';
import { MyBookingsPage } from './pages/MyBookingsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { LockerPage } from './pages/LockerPage.js';
import { LockerMapPage } from './pages/LockerMapPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { User, Item } from './types.js';
import { api } from './api.js';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<any>({});

  // Active item detail / checkout
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutStartDate, setCheckoutStartDate] = useState('');
  const [checkoutEndDate, setCheckoutEndDate] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check login token on mount
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('lendnest_token');
      if (token) {
        try {
          const res = await api.getMe();
          setCurrentUser(res.user);
        } catch {
          localStorage.removeItem('lendnest_token');
        }
      }
    }
    checkAuth();
  }, []);

  // URL Hash & Query routing support for direct links and browser back/forward buttons
  useEffect(() => {
    const parseUrlRoute = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const pageParam = (searchParams.get('page') || '').toLowerCase();

      if (hash === 'hub-map' || hash === 'locker-map' || hash === 'map' || pageParam === 'locker-map' || pageParam === 'hub-map') {
        setCurrentPage('locker-map');
      } else if (hash === 'browse' || pageParam === 'browse') {
        setCurrentPage('browse');
      } else if (hash === 'lockers' || pageParam === 'lockers') {
        setCurrentPage('lockers');
      } else if (hash === 'my-bookings' || pageParam === 'my-bookings') {
        setCurrentPage('my-bookings');
      } else if (hash === 'admin' || pageParam === 'admin') {
        setCurrentPage('admin');
      } else if (hash === 'add-listing' || pageParam === 'add-listing') {
        setCurrentPage('add-listing');
      } else if (hash === 'landing' || hash === '') {
        setCurrentPage('landing');
      }
    };

    parseUrlRoute();
    window.addEventListener('hashchange', parseUrlRoute);
    window.addEventListener('popstate', parseUrlRoute);
    return () => {
      window.removeEventListener('hashchange', parseUrlRoute);
      window.removeEventListener('popstate', parseUrlRoute);
    };
  }, []);

  const handleNavigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync browser URL hash for bookmarking and sharing
    if (page === 'landing') {
      window.location.hash = '';
    } else if (page === 'locker-map') {
      window.location.hash = '/hub-map';
    } else {
      window.location.hash = `/${page}`;
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('lendnest_token');
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
    if (currentPage === 'admin' || currentPage === 'profile' || currentPage === 'my-bookings') {
      setCurrentPage('landing');
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setCurrentPage('item-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCheckout = (item: Item, startDate: string, endDate: string) => {
    setSelectedItem(item);
    setCheckoutStartDate(startDate);
    setCheckoutEndDate(endDate);
    setCheckoutModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        {currentPage === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
            onSelectItem={handleSelectItem}
          />
        )}

        {currentPage === 'browse' && (
          <BrowsePage
            initialSearch={pageParams.search}
            initialCategory={pageParams.category}
            onSelectItem={handleSelectItem}
          />
        )}

        {currentPage === 'item-details' && selectedItem && (
          <ItemDetailsPage
            item={selectedItem}
            currentUser={currentUser}
            onBack={() => handleNavigate('browse')}
            onOpenCheckout={handleOpenCheckout}
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'add-listing' && (
          <AddListingPage
            currentUser={currentUser}
            editItem={editingItem}
            onSuccess={(item) => {
              setEditingItem(null);
              handleSelectItem(item);
            }}
            onCancel={() => {
              setEditingItem(null);
              handleNavigate('browse');
            }}
            showToast={showToast}
          />
        )}

        {currentPage === 'my-bookings' && (
          <MyBookingsPage
            currentUser={currentUser}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentPage === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onEditItem={(item) => {
              setEditingItem(item);
              setCurrentPage('add-listing');
            }}
            onUpdateUser={(user) => setCurrentUser(user)}
            showToast={showToast}
          />
        )}

        {currentPage === 'lockers' && (
          <LockerPage
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            showToast={showToast}
          />
        )}

        {currentPage === 'locker-map' && (
          <LockerMapPage
            currentUser={currentUser}
            initialSelectedHubId={pageParams?.hubId}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentPage === 'admin' && (
          <AdminPage
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => setCurrentUser(user)}
        showToast={showToast}
      />

      {checkoutModalOpen && selectedItem && (
        <CheckoutModal
          isOpen={checkoutModalOpen}
          item={selectedItem}
          startDate={checkoutStartDate}
          endDate={checkoutEndDate}
          onClose={() => {
            setCheckoutModalOpen(false);
          }}
          onSuccess={() => {
            // Success handler
          }}
          onNavigate={handleNavigate}
          showToast={showToast}
        />
      )}

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
