export type CategoryTypes = {
  [key: string]: string
}

export interface Division {
  [key: string]: number | string | boolean | undefined | Array<any>
  DivisionId: number;
  Date: string;
  PublicationUpdated: string;
  Number: number;
  IsDeferred: boolean;
  EVELType: string;
  EVELCountry: string;
  Title: string;
  AyeCount: number;
  NoCount: number;
  DoubleMajorityAyeCount?: number;
  DoubleMajorityNoCount?: number;
  category: string
}

export interface PublishedDivision {
  DivisionId: number;
  Date: string;
  PublicationUpdated: string;
  Number: number;
  IsDeferred: boolean;
  EVELType: string;
  EVELCountry: string;
  Title: string;
  AyeCount: number;
  NoCount: number;
  DoubleMajorityAyeCount: number;
  DoubleMajorityNoCount: number;
}

export interface MemberVoting {
  MemberId: number,
  MemberVotedAye: boolean,
  PublishedDivision: PublishedDivision
}

export type DivisionMessage = {
  id: number,
  title: string,
  date: string
}

export type Teller = {
  MemberId: number,
  Name: string,
  Party: string,
  SubParty?: string,
  PartyColour?: string,
  PartyAbbreviation?: string,
  MemberFrom?: string,
  ListAs?: string,
  ProxyName?: string
}

export interface DivisionResposne extends Division {
  Ayes: Array<Teller>
  Noes: Array<Teller>
}

export type DivisionDetails = {
  division: Division,
  ayes: Array<Teller>
  noes: Array<Teller>
}
