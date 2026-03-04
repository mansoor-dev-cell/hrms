async function createAdmin() {

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://localhost:5000/create-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, email, password })
  });

  const data = await response.json();

  document.getElementById("response").innerText =
    JSON.stringify(data, null, 2);
}