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

export default function CameraPage() {
  const [side, setSide] = useState('front');

  return (
    <Page name="camera">
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
      <Navbar title="Camera" backLink="Back" />
    </Page>
  );
}
