/* script.js - basic interactivity and client-side order flow prototype.
   - For the assignment this provides validation, gallery slider, order storage, admin UI and a simulated notification flow.
   - For production SMS/real geocoding see instructions below.
*/
document.addEventListener('DOMContentLoaded', () => {
  // set year
  const y = new Date().getFullYear();
  document.getElementById('year')?.textContent = y;
  document.getElementById('year2')?.textContent = y;
  document.getElementById('year3')?.textContent = y;

  // load gallery images from assets/gallery (we'll attempt 4 default names)
  const gallery = document.getElementById('gallerySlider');
  if (gallery) {
    const imgs = ['assets/gallery/img1.jpg','assets/gallery/img2.jpg','assets/gallery/img3.jpg'].map(p=>{
      const img=document.createElement('img'); img.src=p; img.alt='gallery'; return img;
    });
    imgs.forEach(i=>gallery.appendChild(i));
    // make simple slider
    let idx=0;
    const allImgs = gallery.querySelectorAll('img');
    function show(i){
      allImgs.forEach((img,j)=> img.style.display = j===i ? 'block' : 'none');
    }
    if(allImgs.length) show(0);
    document.getElementById('prev')?.addEventListener('click', ()=>{ idx=(idx-1+allImgs.length)%allImgs.length; show(idx); });
    document.getElementById('next')?.addEventListener('click', ()=>{ idx=(idx+1)%allImgs.length; show(idx); });
  }

  // ORDER FORM logic
  const orderForm = document.getElementById('orderForm');
  // EmailJS integration (Order confirmation)
if (orderForm) {
  orderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(orderForm);
    const orderDetails = {
      fullname: formData.get("fullname"),
      mobile: formData.get("mobile"),
      location: formData.get("location"),
      product: formData.get("product"),
      quantity: formData.get("quantity"),
      notes: formData.get("notes"),
      total: document.getElementById("orderTotal").textContent
    };

    // Save to localStorage
    const orders = JSON.parse(localStorage.getItem("obness_orders") || "[]");
    orders.push({ ...orderDetails, id: Date.now(), status: "pending" });
    localStorage.setItem("obness_orders", JSON.stringify(orders));

    // Send email
    emailjs.send(" service_my5ikp7"," template_iinemi9 ", orderDetails)

  
      .then(() => {
        document.getElementById("formMessage").textContent =
          "✅ Order placed! A confirmation email has been sent.";
      })
      .catch(err => {
        document.getElementById("formMessage").textContent =
          "⚠️ Order saved, but email failed.";
        console.error(err);
      });

    orderForm.reset();
  });
}


  function updateTotal(){
    const product = orderForm.querySelector("input[name='product']:checked");
    const price = parseFloat(product.dataset.price);
    const qty = parseInt(orderForm.querySelector("input[name='quantity']").value) || 1;
    document.getElementById('orderTotal').textContent = (price * qty).toFixed(2);
  }
  updateTotal();
  orderForm.addEventListener('input', updateTotal);

  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('formMessage').textContent = '';
    const formData = new FormData(orderForm);
    const order = {
      id: 'ord' + Date.now(),
      fullname: formData.get('fullname').trim(),
      mobile: formData.get('mobile').trim(),
      location: formData.get('location').trim(),
      product: formData.get('product'),
      quantity: parseInt(formData.get('quantity')) || 1,
      notes: formData.get('notes').trim(),
      price: parseFloat(document.getElementById('orderTotal').textContent),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    // basic validation
    if(!order.fullname || !order.mobile || !order.location) {
      document.getElementById('formMessage').textContent = 'Please fill required fields.';
      return;
    }
    // save to localStorage as "orders"
    const orders = JSON.parse(localStorage.getItem('obness_orders') || '[]');
    orders.push(order);
    localStorage.setItem('obness_orders', JSON.stringify(orders));

    // Simulate sending notification to delivery mobile - in prototype we show a message to user
    document.getElementById('formMessage').textContent = `Order placed! Order ID: ${order.id}. We will notify ${order.mobile} when delivery is made.`;
    orderForm.reset();
    updateTotal();
    // notify admin UI (if open in another tab, admin.html will poll localStorage; otherwise admin can reload)
    window.dispatchEvent(new Event('storage')); // let other tabs know
  });
}

  // ADMIN UI - load orders from localStorage
  const ordersList = document.getElementById('ordersList');
  if (ordersList) {
    function renderOrders(){
      const orders = JSON.parse(localStorage.getItem('obness_orders') || '[]').reverse();
      ordersList.innerHTML = '';
      if(!orders.length) {
        ordersList.innerHTML = '<p class="muted">No orders yet.</p>';
        return;
      }
      orders.forEach(o=>{
        const card = document.createElement('div'); card.className='order-card';
        card.innerHTML = `
          <div><strong>${o.fullname}</strong> — ${o.product} × ${o.quantity}</div>
          <div>Mobile: ${o.mobile} • Location: ${o.location}</div>
          <div>Price: ${o.price.toFixed(2)} USD • Status: <strong id="st-${o.id}">${o.status}</strong></div>
          <div class="order-actions">
            <button data-id="${o.id}" class="btn mark-deliver">Mark Delivered</button>
            <button data-id="${o.id}" class="btn mark-pending">Mark Pending</button>
            <button data-id="${o.id}" class="btn btn-danger delete-order">Delete</button>
          </div>
        `;
        ordersList.appendChild(card);
      });
      // add listeners
      ordersList.querySelectorAll('.mark-deliver').forEach(b=>{
        b.onclick = ()=>{
          const id=b.dataset.id; updateStatus(id,'delivered');
        };
      });
      ordersList.querySelectorAll('.mark-pending').forEach(b=>{
        b.onclick = ()=>{
          const id=b.dataset.id; updateStatus(id,'pending');
        };
      });
      ordersList.querySelectorAll('.delete-order').forEach(b=>{
        b.onclick = ()=>{
          const id=b.dataset.id; deleteOrder(id);
        };
      });
    }
    function updateStatus(id, status){
      const orders = JSON.parse(localStorage.getItem('obness_orders') || '[]');
      const idx = orders.findIndex(o=>o.id===id);
      if(idx>=0){
        orders[idx].status = status;
        localStorage.setItem('obness_orders', JSON.stringify(orders));
        renderOrders();
        // in production, call your server to send SMS to customer and notify sender (admin)
        document.getElementById('adminMessage').textContent = `Order ${id} marked as ${status}.`;
      }
    }
    function deleteOrder(id){
      let orders = JSON.parse(localStorage.getItem('obness_orders') || '[]');
      orders = orders.filter(o=>o.id!==id);
      localStorage.setItem('obness_orders', JSON.stringify(orders));
      renderOrders();
      document.getElementById('adminMessage').textContent = `Order ${id} deleted.`;
    }

    // initial render
    renderOrders();
    // re-render if storage changes (other tab)
    window.addEventListener('storage', renderOrders);
  }

  // MAP preview on order page (prototype)
  const previewBtn = document.getElementById('previewLocation');
  if(previewBtn){
    previewBtn.addEventListener('click', ()=>{
      const loc = document.getElementById('locationInput').value.trim();
      const mapFrame = document.getElementById('mapFrame');
      if(!loc){
        mapFrame.innerHTML = '<p class="muted">Please enter a location to preview.</p>';
        return;
      }
      // We'll embed a Google Maps search iframe (no API key needed for simple embed)
      const url = `https://www.google.com/maps/search/${encodeURIComponent(loc)}/@`;
      mapFrame.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:0" loading="lazy"></iframe>`;
    });
  }

  // small utility: if admin triggered, show console message.
});
// GOOGLE MAPS AUTOCOMPLETE (Order Page)
if (document.getElementById("locationInput")) {
  let autocomplete = new google.maps.places.Autocomplete(
    document.getElementById("locationInput"),
    { types: ["geocode"] }
  );
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      document.getElementById("mapPreview").innerHTML =
        `<iframe width="100%" height="100%" style="border:0"
          src="https://www.google.com/maps?q=${lat},${lng}&hl=es;z=14&output=embed">
        </iframe>`;
    }
  });
}

// ORDER FORM PRICE CALCULATION
const orderForm = document.getElementById("orderForm");
if (orderForm) {
  const totalEl = document.getElementById("orderTotal");
  const calcTotal = () => {
    const product = orderForm.querySelector("input[name='product']:checked");
    const price = parseFloat(product.dataset.price);
    const qty = parseInt(orderForm.querySelector("input[name='quantity']").value) || 1;
    totalEl.textContent = (price * qty).toFixed(2);
  };
  orderForm.addEventListener("input", calcTotal);
  calcTotal();
}

// ADMIN LOGIN
if (document.getElementById("loginBtn")) {
  const loginBtn = document.getElementById("loginBtn");
  loginBtn.addEventListener("click", () => {
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;
    // Demo credentials (change here for your admin)
    if (user === "admin" && pass === "flowers123") {
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("ordersSection").style.display = "block";
      localStorage.setItem("adminLoggedIn", "true");
    } else {
      document.getElementById("loginMessage").textContent = "Invalid login!";
    }
  });

  // Auto-login if already logged in
  if (localStorage.getItem("adminLoggedIn") === "true") {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("ordersSection").style.display = "block";
  }
}
