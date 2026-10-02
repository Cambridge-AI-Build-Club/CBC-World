export interface Ambassador {
  id: string;
  name: string;
  university: string;
  role?: string;
  field?: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  bio?: string;
}

export interface UniversityInfo {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface UniversityHub extends UniversityInfo {
  id: string;
  name: string;
  ambassadors: Ambassador[];
}

/** A marker on the globe: one or more universities merged at the current zoom. */
export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  hubs: UniversityHub[];
  count: number;
}
