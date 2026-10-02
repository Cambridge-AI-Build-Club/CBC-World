// Sign-up form shown in the "Join the map" dialog. These are public links, so they live here
// as defaults; VITE_FORM_EMBED_URL / VITE_FORM_LINK (in .env or CI) override them.
const DEFAULT_FORM_LINK =
  'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=RQSlSfq9eUut41R7TzmG6ViLfiycMl5Phrl2grRDcjlUMTNPV0pHODZDNzg1TzZYNjkxOTdSQVEyQy4u';
const DEFAULT_FORM_EMBED_URL = `${DEFAULT_FORM_LINK}&embed=true`;

export const FORM_EMBED_URL = import.meta.env.VITE_FORM_EMBED_URL?.trim() || DEFAULT_FORM_EMBED_URL;
export const FORM_LINK =
  import.meta.env.VITE_FORM_LINK?.trim() || FORM_EMBED_URL.replace(/[?&](embedded|embed)=true/, '');
