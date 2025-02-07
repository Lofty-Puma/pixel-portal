import { OPENSEA_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

const metadataMap: Map<string, Map<string, CollectionMetadata>> = new Map();

export interface CollectionMetadata {
  collection: string,
  name: string,
  description: string,
  imageUrl: string,
}

export async function GET({ params, fetch }) {
  if (metadataMap.has(params.chainName) && metadataMap.get(params.chainName)?.has(params.contractAddress)) {
    return json(metadataMap.get(params.chainName)?.get(params.contractAddress));
  }

  const headers = { 'x-api-key': OPENSEA_API_KEY };

  const contractResponse = await fetch(`${OPENSEA_BASE_URL}/chain/${params.chainName}/contract/${params.contractAddress}`, { headers });
  const contractJson = await contractResponse.json();
  const parsedContractJson: { collection: string } = {
    collection: contractJson["collection"],
  }

  const collectionResponse = await fetch(`${OPENSEA_BASE_URL}/collections/${parsedContractJson.collection}`, { headers });
  const collectionJson = await collectionResponse.json();
  const collection: CollectionMetadata = {
    collection: collectionJson["collection"],
    name: collectionJson["name"],
    description: collectionJson["description"],
    imageUrl: collectionJson["image_url"]
  }


  if (!metadataMap.has(params.chainName)) {
    metadataMap.set(params.chainName, new Map());
  }
  metadataMap.get(params.chainName)?.set(params.contractAddress, collection);
  return json(collection);
}