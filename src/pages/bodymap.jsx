import React from 'react';
import { Page, Navbar, Block } from 'framework7-react';

export default function BodyMapPage() {
  return (
    <Page name="bodymap">
      <Navbar title="My Body" backLink="Back" />
      <Block strong>
        <p>Hier kommt deine interaktive SVG-Körperkarte hin.</p>
      </Block>
    </Page>
  );
}
