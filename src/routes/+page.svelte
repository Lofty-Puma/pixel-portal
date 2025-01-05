<script>
  import {PUBLIC_THIRD_WEB_CLIENT_ID} from "$env/static/public";
  fetch("https://insight-api.thirdweb.com/v1/tokens/erc1155/:ownerAddress", {
    headers: {
      "X-Client-Id": PUBLIC_THIRD_WEB_CLIENT_ID,
    },
  });
</script>

<div class="container">
  <h1>Welcome to the NFT Collection Browser and Transfer Tool</h1>
  <p>Connect your wallet to browse and manage your NFT collections.</p>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #f0f0f0;
  }
  h1 {
    color: #333;
  }
  button {
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    transition: background-color 0.3s;
  }
  button:hover {
    background-color: #0056b3;
  }
</style>
