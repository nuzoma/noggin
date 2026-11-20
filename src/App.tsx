import { useCallback, useEffect, useState } from 'react';
import { HomeView } from './components/HomeView';
import { HostView } from './components/HostView';
import { JoinView } from './components/JoinView';
import { PlayerView } from './components/PlayerView';
import { ScreenView } from './components/ScreenView';

type AppRoute =
  | { view: 'home' }
  | { view: 'join'; initialCode: string }
  | { view: 'host'; hostToken: string }
  | { view: 'play'; code: string }
  | { view: 'screen'; code: string };

function parseRoute(): AppRoute {
  const pathname = window.location.pathname;
  const search = new URLSearchParams(window.location.search);

  const hostMatch = pathname.match(/^\/host\/([A-Za-z0-9_-]+)\/?$/);
  if (hostMatch) {
    return { view: 'host', hostToken: hostMatch[1] };
  }

  const screenMatch = pathname.match(/^\/(?:screen|tv)\/([A-Za-z0-9]+)\/?$/);
  if (screenMatch) {
    return { view: 'screen', code: screenMatch[1].toUpperCase() };
  }

  const playMatch = pathname.match(/^\/(?:play|join)\/([A-Za-z0-9]+)\/?$/);
  if (playMatch) {
    return { view: 'play', code: playMatch[1].toUpperCase() };
  }

  const initialCode = (search.get('code') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (/^\/join\/?$/.test(pathname) || initialCode.length > 0) {
    return { view: 'join', initialCode };
  }

  return { view: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parseRoute());
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (route.view === 'host') {
    return (
      <HostView
        key={route.hostToken}
        hostToken={route.hostToken}
        onExitHome={() => navigate('/')}
        onNewGame={(newToken) => navigate(`/host/${newToken}`)}
      />
    );
  }

  if (route.view === 'screen') {
    return (
      <ScreenView
        key={route.code}
        code={route.code}
        onExitHome={() => navigate('/')}
      />
    );
  }

  if (route.view === 'play') {
    return (
      <PlayerView
        key={route.code}
        code={route.code}
        onExitHome={() => navigate('/')}
      />
    );
  }

  if (route.view === 'join') {
    return (
      <JoinView
        initialCode={route.initialCode}
        onBack={() => navigate('/')}
        onNavigatePlay={(code) => navigate(`/play/${code}`)}
      />
    );
  }

  return (
    <HomeView
      onNavigateHost={(hostToken) => navigate(`/host/${hostToken}`)}
      onNavigateJoin={() => navigate('/join')}
      onNavigatePlay={(code) => navigate(`/play/${code}`)}
    />
  );
}
