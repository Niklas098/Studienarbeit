import '../css/bodymap.scss';
import React from 'react';
import {
  Page,
  Navbar,
  NavLeft,
  NavTitle,
  NavTitleLarge,
  NavRight,
  Link,
  Toolbar,
  Block,
  BlockTitle,
  List,
  ListItem,
  Button,
  Segmented
} from 'framework7-react';
import { useEffect, useState } from 'react';

export default function BodyMapPage() {
  const [side, setSide] = useState('front');

  // Preload, damit beim Umschalten nichts flackert
  useEffect(() => {
    const imgs = ['/img/Body_Front.png', '/img/Body_Back.png'];
    imgs.forEach(src => { const i = new Image(); i.src = src; });
  }, []);

  return (
    <Page name="bodymap">
      {/* Toolbar */}
            <Toolbar tabbar labels bottom>
                <Link href="/bodymap/" iconF7="person_alt" text="My body" tabLinkActive />
                <Link href="/" iconF7="envelope" text="Menü" />
      
                <Link href="/camera/" className="tab-link camera-tab">
                  <span className="camera-circle">
                    <i className="icon f7-icons">camera</i>
                  </span>
                </Link>
      
                <Link href="/info/" iconF7="info" text="Info" />
                <Link href="/profile/" iconF7="ellipsis_vertical" text="Profile" />
            </Toolbar>

      <Navbar title="Mein Körper" />
      <Block strong className="no-margin no-padding text-center">
        <Segmented raised className="segment-top">
          <Button tabLinkActive={side==='front'} onClick={() => setSide('front')}>
            Vorne
          </Button>
          <Button tabLinkActive={side==='back'} onClick={() => setSide('back')}>
            Hinten
          </Button>
        </Segmented>
      </Block>

      <div className="flex justify-center items-center px-6">
        <img
          key={side}                         // sorgt für kleines Fade bei Wechsel
          src={side === 'front' ? '/img/Body_Front.png' : '/img/Body_Back.png'}
          alt={side === 'front' ? 'Front view' : 'Back view'}
          className="w-full max-w-sm select-none"
          draggable="false"
        />
      </div>
    </Page>
  );
}
