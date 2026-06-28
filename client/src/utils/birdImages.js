// Maps bird common names and eBird species codes to local curated reference images.
// Images live in client/public/bird-images/ and are served from /bird-images/*.webp.

const BY_SPECIES_CODE = {
  norcar: "/bird-images/northern-cardinal.webp",
  baleag: "/bird-images/bald-eagle.webp",
  normoc: "/bird-images/northern-mockingbird.webp",
  amerob: "/bird-images/american-robin.webp",
  blujay: "/bird-images/blue-jay.webp",
  moudov: "/bird-images/mourning-dove.webp",
  houspa: "/bird-images/house-sparrow.webp",
  eursta: "/bird-images/european-starling.webp",
  amecro: "/bird-images/american-crow.webp",
  cangoo: "/bird-images/canada-goose.webp",
  mallar3: "/bird-images/mallard.webp",
  rethaw: "/bird-images/red-tailed-hawk.webp",
  dowwoo: "/bird-images/downy-woodpecker.webp",
  amegfi: "/bird-images/american-goldfinch.webp",
  grbher3: "/bird-images/great-blue-heron.webp",
  greegr: "/bird-images/great-egret.webp",
  laugul: "/bird-images/laughing-gull.webp",
  brnpel: "/bird-images/brown-pelican.webp",
  magfri: "/bird-images/magnificent-frigatebird.webp",
  banana: "/bird-images/bananaquit.webp",
  comyel: "/bird-images/common-yellowthroat.webp",
};

const BY_COMMON_NAME = {
  "northern cardinal": "/bird-images/northern-cardinal.webp",
  "bald eagle": "/bird-images/bald-eagle.webp",
  "northern mockingbird": "/bird-images/northern-mockingbird.webp",
  "american robin": "/bird-images/american-robin.webp",
  "blue jay": "/bird-images/blue-jay.webp",
  "mourning dove": "/bird-images/mourning-dove.webp",
  "house sparrow": "/bird-images/house-sparrow.webp",
  "european starling": "/bird-images/european-starling.webp",
  "american crow": "/bird-images/american-crow.webp",
  "canada goose": "/bird-images/canada-goose.webp",
  mallard: "/bird-images/mallard.webp",
  "red-tailed hawk": "/bird-images/red-tailed-hawk.webp",
  "downy woodpecker": "/bird-images/downy-woodpecker.webp",
  "american goldfinch": "/bird-images/american-goldfinch.webp",
  "great blue heron": "/bird-images/great-blue-heron.webp",
  "great egret": "/bird-images/great-egret.webp",
  "laughing gull": "/bird-images/laughing-gull.webp",
  "brown pelican": "/bird-images/brown-pelican.webp",
  "magnificent frigatebird": "/bird-images/magnificent-frigatebird.webp",
  bananaquit: "/bird-images/bananaquit.webp",
  "common yellowthroat": "/bird-images/common-yellowthroat.webp",
};

// Returns a local image path for the given bird, or null if no curated image exists.
export function getBirdImage({ commonName, speciesCode } = {}) {
  if (speciesCode && BY_SPECIES_CODE[speciesCode.toLowerCase()]) {
    return BY_SPECIES_CODE[speciesCode.toLowerCase()];
  }
  if (commonName && BY_COMMON_NAME[commonName.toLowerCase().trim()]) {
    return BY_COMMON_NAME[commonName.toLowerCase().trim()];
  }
  return null;
}
