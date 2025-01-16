
export async function load({ params, data }) {
  console.log("reloaded page with", params)
  return {
    ...data,
    params
  }
}