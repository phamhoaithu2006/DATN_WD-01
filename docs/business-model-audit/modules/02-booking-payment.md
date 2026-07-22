# Audit Business Model — Booking, định giá và VNPAY (BR-021–BR-034)

## Phạm vi và quy ước

- Tài liệu nguồn: `docs/reverse-engineering/03-business-rules-brd.md` (BR-021–BR-034), đối chiếu `04-srs.md` FR-004/FR-005, `05-use-cases.md` UC-008/UC-013/UC-014/UC-015/UC-028, `07-database-erd.md`, `08-api-specification.md` và `09-permission-crud-matrices.md`.
- Source được truy vết từ route đến controller, Form Request, service, model, migration, command/scheduler và test hiện hữu.
- Kết luận BR áp dụng rubric: `Đúng` khi toàn bộ mệnh đề BR có bằng chứng; BUG liên quan yêu cầu bổ sung trong FR/UC/API không tự động đổi kết luận của mệnh đề BR.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File | Hàm | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
|---|---|---|---|---|---|
| BR-021 | Có | `StoreBookingRequest.php` | `rules()`, `after()` | Đúng | Medium — BUG-AB-001/002 ở hợp đồng input và schema |
| BR-022 | Có | `CustomerBookingController.php` | `preview()`, `store()`, `ensureDepartureCanBeBooked()`, `buildQuantityPricing()` | Đúng | — |
| BR-023 | Có | `TourPricingService.php` | `resolveBasePrice()`, `resolveDiscountPrice()`, `resolveAdultPrice()` | Đúng | — |
| BR-024 | Có | `TourPricingService.php`; `CustomerBookingController.php` | `resolveRuleForAge()`, `calculateParticipantPrice()`, `store()` | Đúng | Critical — BUG-AB-003 ở tích hợp tổng tiền booking |
| BR-025 | Có | `CustomerBookingController.php` | `store()` | Đúng | Critical — BUG-AB-003 ảnh hưởng dữ liệu tiền |
| BR-026 | Có | `CustomerBookingController.php`; `VnpayService.php` | `store()`, `createPaymentUrl()` | Đúng | — |
| BR-027 | Có | `CustomerBookingController.php` | `continuePayment()` | Đúng | — |
| BR-028 | Có | `CustomerBookingController.php`; `VnpayPaymentLifecycleService.php` | `cancel()`, `failPendingPayment()` | Đúng | — |
| BR-029 | Có | `VnpayService.php` | `isConfigured()`, `createPaymentUrl()`, `ensureConfigured()` | Đúng | — |
| BR-030 | Có | `VnpayPaymentController.php`; `VnpayService.php` | `returnStatus()`, `ipn()`, `processVnpayResponse()`, `verifyResponse()` | Đúng | — |
| BR-031 | Có | `VnpayPaymentController.php` | `processVnpayResponse()` | Đúng | — |
| BR-032 | Có | `VnpayPaymentController.php`; `VnpayPaymentLifecycleService.php` | `processVnpayResponse()`, `failPendingPayment()` | Đúng | — |
| BR-033 | Có | `ExpirePendingVnpayPayments.php`; `routes/console.php` | `handle()` | Đúng | — |
| BR-034 | Có | `Admin/PaymentController.php` | `confirm()`, `fail()`, `refund()`, `updateStatus()` | Đúng | High — FR-005 trái source tại BUG-AB-004 |

## Phân tích chi tiết

### BR-021 — Số lượng và dữ liệu hành khách booking

**Business Rule.** Booking customer có 1–20 người; số dòng participant bằng `number_of_people`; tổng `quantity_summary` (nếu có) bằng số người; ngày sinh không sau hôm nay.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php` — `StoreBookingRequest::authorize()`, `rules()`, `after()`.
- Controller/Route: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php::store()`; `POST /api/customer/bookings` tại `backend_laravel/routes/api.php`.
- Service/Action/Use Case/Domain Service/Repository: service pricing/VNPAY được controller gọi sau validation; không có Action/Use Case/Domain Service/Repository layer riêng.
- Model: `Booking`, `BookingContact`, `BookingParticipant`, `TourAgePricingRule`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng ở bước Form Request.
- Middleware: `auth:sanctum`, `role:customer`; `authorize()` còn yêu cầu user khác null.
- Migrations: `2026_06_10_220060_create_bookings_table.php`; `2026_06_10_220070_create_booking_contacts_table.php`; `2026_06_10_220080_create_booking_participants_table.php`; `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`.

**Database**

- Form Request chỉ read existence `tour_departures`, `tour_age_pricing_rules`; write diễn ra ở BR-025.
- Sau validation, insert `bookings`, một `booking_contacts`, 1–20 `booking_participants` trong transaction BR-025.
- Transaction/Rollback/Lock: validation trước transaction; toàn bộ write booking nằm trong `DB::transaction(..., 3)`, rollback tự động khi exception. Lock tour/departure mô tả BR-025.
- Idempotent: Không có idempotency key cho create booking.

**Validation/Authorization/Exception**

- `number_of_people`: required|integer|min1|max20.
- `participants`: required|array|min1|max20; full_name required max255; birth_date required date <=today; gender required in male/female/other; các field nullable theo request.
- `after()`: count participants phải đúng number; quantity summary không rỗng thì sum quantity phải đúng number.
- Contact: object required; name/phone required; email nullable/email; các giới hạn chi tiết tại API Specification #33.
- Authorization: chỉ current customer; guest `401`, role khác `403`, Form Request authorization false theo framework.
- Exception: validation `422`; lỗi DB trong transaction không có catch custom.

**Notification/Queue/Audit/Data Integrity**

- Notification/Queue/Audit Log: Không sử dụng trong tạo booking.
- `contact_email` nullable ở request nhưng cột không nullable là BUG-AB-001. Nhiều giới hạn chuỗi API lớn hơn cột migration là BUG-AB-002.
- Duplicate/double submit: booking code dùng ULID + unique DB, nhưng không có client idempotency key; hai request hợp lệ là hai booking độc lập theo source.

**Kết luận: Đúng.** Mọi mệnh đề trực tiếp BR-021 được triển khai. Hai sai lệch hợp đồng API/schema được lập BUG độc lập.

### BR-022 — Điều kiện tour/departure đủ điều kiện đặt

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, methods `preview()`, `store()`, `ensureDepartureCanBeBooked()`, `buildQuantityPricing()`.
- Routes: `POST /api/customer/bookings/preview`; `POST /api/customer/bookings`; customer middleware.
- Service: `TourPricingService`; Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models/Migrations: `Tour`, `TourDeparture`, `Booking`; tours/departures/bookings migrations.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- API integration: VNPAY chỉ được kiểm cấu hình ở store; điều kiện booking tự xử lý nội bộ.

**Database và flow**

- Read tour/departure/age rules. Store lock tour + departure, sau đó tạo dữ liệu BR-025; preview không ghi DB.
- Rule: tour status `published`; departure status `open`; departure_date không trước today; tổng quantity >0; available slots đủ; adult price >0.
- Transaction/Rollback: preview không; store dùng transaction và rollback. Lock: store `lockForUpdate()` tour/departure; preview không lock.
- Idempotent: preview read-only; store không idempotent.

**Validation/Authorization/Exception/Data Integrity**

- Preview validates departure, quantity array/rule/quantity; store dùng BR-021. `ValidationException` trả `422`; missing model `404`.
- Customer đã xác thực; role khác bị `403`.
- Không audit/notification/queue.
- Overbooking: store tính available slots sau row lock; đây là bằng chứng locking trực tiếp. Preview chỉ là thông tin, store kiểm lại.

**Kết luận: Đúng.**

### BR-023 — Thứ tự ưu tiên giá người lớn

**Source Code**

- File/Class/Method: `backend_laravel/app/Services/TourPricingService.php` — `resolveBasePrice()`, `resolveDiscountPrice()`, `resolveAdultPrice()`.
- Route: Không có route riêng; được gọi từ API tour/booking.
- Models: `Tour`, `TourDeparture`; migrations tours/departures và `2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php`.
- Controller: các controller gọi service; Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng trong service.

**Database và kiểm soát**

- Chỉ đọc object đã load: base ưu tiên departure.base_price, rồi departure.price, rồi tour.base_price. Discount departure chỉ xét khi departure.base_price khác null; legacy price trả null discount; không có cả hai thì lấy tour.discount_price.
- Không write/transaction/rollback/lock/audit; hàm tính toán không tạo side effect, idempotent theo nghĩa cùng input cho cùng output.
- Validation/authorization/exception: Không ở service; controller caller chịu trách nhiệm.
- Data integrity risk thuộc danh mục yêu cầu: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về write trong các method này.

**Kết luận: Đúng.**

### BR-024 — Giá hành khách theo tuổi

**Source Code**

- File/Class/Method: `backend_laravel/app/Services/TourPricingService.php` — class `TourPricingService`, methods `resolveRuleForAge()`, `calculateParticipantPrice()`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `store()` gọi service cho từng participant.
- Route: không riêng; tích hợp `POST /api/customer/bookings`.
- Models/Migrations: `Tour`, `TourDeparture`, `TourAgePricingRule`, `BookingParticipant`; age pricing + pricing snapshot migrations.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và flow**

- Read age rules active theo relation đã order; tuổi là `birthDate->diffInYears(travelDate)` với travelDate là ngày đi.
- Rule đầu tiên chứa tuổi được chọn; `free=0`, `fixed=price_value`, mặc định percentage; không rule dùng adult price.
- Store ghi snapshot `booking_participants.unit_price/pricing_rule_label/pricing_type/pricing_value` theo kết quả service.
- Transaction/Rollback/Lock: các snapshot ghi trong transaction BR-025; tour/departure bị khóa. Service tự thân không transaction.
- Idempotency: method tính giá không side effect; create booking không idempotent.

**Validation/Authorization/Exception/Data Integrity**

- DOB required <= today. Nếu có active rules, participant_type khác adult nhưng không khớp rule thì store ném ValidationException.
- Customer middleware; không policy. Không notification/queue/audit.
- Data integrity: `booking.total_amount` không được tính từ collection `$pricedParticipants`; controller dùng `$pricingSummary['subtotal']` từ `quantity_summary`. Không có bước đối chiếu rule/quantity do client chọn với DOB-derived rule của participant. Sai lệch yêu cầu UC-013/FR-004 được lập BUG-AB-003.

**Kết luận: Đúng.** Service và snapshot triển khai đầy đủ mệnh đề BR-024; lỗi tích hợp tổng tiền là BUG ở flow booking rộng hơn.

### BR-025 — Transaction tạo booking VNPAY

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `store()`.
- Route/Middleware: `POST /api/customer/bookings`; `auth:sanctum`, `role:customer`.
- Services: `TourPricingService`, `VnpayService` (check trước/URL sau transaction); Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `Booking`, `BookingContact`, `BookingParticipant`, `Payment`, `BookingStatusHistory`, `Tour`, `TourDeparture`.
- Migrations: bookings/contact/participants/payment/history/departure/pricing snapshot.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng trong create.
- API integration: VNPAY checkout URL được tạo sau transaction.

**Database**

- Lock: `tour_departures` và `tours` bằng `lockForUpdate()`.
- Insert `bookings` (`pending/unpaid`, promotion null, discount 0), `booking_contacts`, `booking_participants` snapshots, `payments` (`vnpay/pending`), `booking_status_histories` (null→pending).
- Update `tour_departures.booked_slots += number_of_people`.
- Transaction: `DB::transaction(closure, 3)`; số `3` là deadlock retry count của Laravel transaction. Exception trong closure rollback toàn bộ DB writes.
- Delete/Soft Delete/Restore/Pivot/Audit Log: Không có. `booking_status_histories` là lịch sử trạng thái có bằng chứng, không tự gán là audit log tổng quát.
- Idempotent: Không có request/idempotency key; ULID chỉ tạo booking_code mới.

**Validation/Authorization/Exception/Data Integrity**

- Validation BR-021/022/024; VNPAY chưa cấu hình ném ValidationException trước transaction; customer current user làm `user_id/changed_by`.
- Exception DB/validation không catch trong method; rollback chỉ áp dụng phần closure. URL được tạo sau commit.
- Duplicate/Double Submit: không có idempotency guard. Overbooking được lock và kiểm lại trong transaction.
- Total pricing mismatch được chứng minh tại BUG-AB-003.
- Notification/Queue: Không sử dụng.

**Kết luận: Đúng.** Các bảng, state, lock, retry, history, slot và promotion/discount đều khớp mệnh đề.

### BR-026 — Hạn payment 15 phút và checkout URL

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `store()`; `backend_laravel/app/Services/VnpayService.php` — class `VnpayService`, method `createPaymentUrl()`.
- Route: `POST /api/customer/bookings`.
- Model/Migration: `Payment`, `Booking`; payments migration và `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`.
- Service: `VnpayService`; các layer Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- API integration: VNPAY sandbox/payment URL.

**Database và kiểm soát**

- Insert `payments.expires_at = now('Asia/Ho_Chi_Minh')->addMinutes(15)` trong transaction.
- Sau khi `DB::transaction()` trả booking và đã load relations, controller mới gọi `createPaymentUrl()` và trả response `201`.
- Rollback: URL generation nằm ngoài transaction booking; không có rollback gộp sau commit. Lock thuộc BR-025. Idempotent create: Không.
- Validation: cấu hình VNPAY được check trước transaction; service còn require method vnpay + expires_at.
- Authorization customer; RuntimeException service không catch; no audit/notification/queue.
- Data integrity: booking/payment đã commit trước khi tạo URL; nếu `createPaymentUrl()` ném exception thì không có transaction hoặc rollback nào hoàn tác booking/payment đã ghi.

**Kết luận: Đúng.** Lưu ý UC-013 ghi thứ tự “ký URL rồi commit”, trong khi source và chính BR-026 cho thấy commit trước tạo URL; kết luận BR theo source vẫn Đúng.

### BR-027 — Tiếp tục thanh toán booking sở hữu

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `continuePayment()`.
- Route: `POST /api/customer/bookings/{booking}/continue-payment`, ID numeric, customer middleware.
- Services: `VnpayService::createPaymentUrl()`, `VnpayPaymentLifecycleService::failPendingPayment()`.
- Models/Migrations: `Booking`, `Payment`, `TourDeparture`, `BookingStatusHistory`; booking/payment/expiry/departure/history migrations.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- API integration: tạo URL VNPAY mới.

**Database và kiểm soát**

- Ownership check trước transaction và sau khi lock. Lock booking + payment; lifecycle còn lock booking/departure khi hết hạn.
- Điều kiện: booking pending, payment_status unpaid, payment tồn tại/vnpay/pending; expires_at tồn tại và chưa past.
- Update `payments.gateway_response=null` khi tiếp tục; hết hạn thì lifecycle fail/cancel/release/history.
- Transaction `DB::transaction(...,3)`; exception rollback. Idempotent: gọi lặp khi còn pending tạo transaction reference mới nhưng không tạo booking/payment hay cộng slot; có test hiện hữu chứng minh.
- Validation: kiểm các trạng thái booking/payment, payment method và `expires_at` bằng các guard trong method; không có Form Request riêng cho body của endpoint.
- Authorization: không sở hữu `abort(404)`; sai state/hết hạn trả `422`.
- Audit: history chỉ ở nhánh hết hạn; notification/queue: Không sử dụng.
- Exception: `404` cho ownership/model, `422` cho state hoặc expiry; exception trong transaction không được method bắt và làm transaction rollback.
- Data integrity: booking/payment/departure được lock trong transaction; nhánh hết hạn cập nhật trạng thái, hoàn slot và history cùng transaction.

**Kết luận: Đúng.**

### BR-028 — Customer hủy booking chờ thanh toán

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `cancel()`; `backend_laravel/app/Services/VnpayPaymentLifecycleService.php` — class `VnpayPaymentLifecycleService`, method `failPendingPayment()`.
- Route: `PATCH /api/customer/bookings/{booking}/cancel`; customer middleware.
- Models/Migrations: Booking, Payment, TourDeparture, BookingStatusHistory; migrations tương ứng.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Lock booking, payment; lifecycle lock booking và departure.
- Lần hợp lệ: update payment failed; decrement departure booked_slots với sàn 0; update booking cancelled/failed/cancel_reason/cancelled_at; insert history pending→cancelled.
- Booking đã cancelled: trả fresh state ngay trước query payment/lifecycle; không trừ slot/ghi history lần hai.
- Transaction `DB::transaction(...,3)` và rollback implicit. Idempotency: explicit cho trạng thái cancelled; test hiện hữu xác nhận slot/history chỉ thay đổi một lần.
- Validation: không có Form Request cho body; method kiểm ownership và trạng thái booking/payment trước khi gọi lifecycle.
- Authorization owner; không owner `404`; state không phù hợp `422`; no audit log riêng, notification/queue.
- Exception: `404` cho ownership/model, `422` cho state không hợp lệ; exception trong closure làm rollback transaction.
- Data integrity: lock booking/payment/departure cùng guard cancelled bảo đảm nhánh tuần tự không hoàn slot hoặc ghi history lần hai.

**Kết luận: Đúng.**

### BR-029 — Tạo và ký URL VNPAY

**Source Code**

- File/Class/Method: `backend_laravel/app/Services/VnpayService.php` — `isConfigured()`, `createPaymentUrl()`, `ensureConfigured()`, `buildQuery()`, `newTransactionReference()`.
- Route: không trực tiếp; caller là create/continue booking.
- Model/Migration: `Payment`; payments/expiry migrations.
- API Integration: VNPAY payment endpoint/return URL từ environment.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.

**Database và kiểm soát**

- Không write DB. Read Payment object.
- Cấu hình bắt buộc: merchant code, hash secret, payment URL, return URL không rỗng.
- Params: amount*100, currency VND, locale vn, expiry/payment reference; `ksort`, URL encoding, HMAC SHA-512.
- Transaction/Rollback/Lock/Audit: Không ở service. Idempotent: mỗi call sinh random suffix mới, nên URL/reference khác.
- Validation/Exception: payment phải method vnpay và có expires_at; thiếu cấu hình/dữ liệu ném RuntimeException. Authorization do caller.
- Queue/Notification: Không sử dụng.
- Data integrity: service không ghi DB; mỗi lần gọi chỉ tạo tham số, chữ ký và URL từ Payment/config hiện có.

**Kết luận: Đúng.**

### BR-030 — Xác minh và chống xử lý lặp callback VNPAY

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php` — `returnStatus()`, `ipn()`, `paymentIdFromPayload()`, `processVnpayResponse()`; `VnpayService::verifyResponse()`.
- Routes: `GET /api/vnpay/return-status`; `GET /api/webhooks/vnpay`, mỗi route `throttle:60,1`, public.
- Services: VnpayService, VnpayPaymentLifecycleService. Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models/Migrations: Payment, Booking; payment/booking migrations.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng trong callback.
- API Integration: VNPAY payload/query.

**Database và kiểm soát**

- Verify HMAC và `vnp_TmnCode` trước xử lý; payment ID từ format `P{id}A...` hoặc integer legacy; amount phải bằng payment.amount*100.
- Transaction với retry 3; lock payment. Nếu status không pending và amount đúng, trả `01 Order already confirmed` không chạy side effect.
- Rollback implicit khi exception. Lock booking/departure thêm trong lifecycle fail. Idempotent: guard payment status + row lock; callbacks lặp không cập nhật lại state đã chốt.
- Validation/authorization: callback public nhưng phải signature/merchant/ref/amount; return lỗi 422/404/503; IPN luôn HTTP 200 với RspCode tương ứng.
- Audit/notification/queue: Không sử dụng; gateway_response lưu trong các nhánh xử lý.
- Data integrity: amount check xảy ra trong payment lock; double callback được serialize theo row.

**Kết luận: Đúng.**

### BR-031 — Callback VNPAY thành công

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php` — class `VnpayPaymentController`, method `processVnpayResponse()`.
- Routes: hai callback public BR-030.
- Services: VnpayService verify trước method; lifecycle không dùng trong success.
- Models/Migrations: Payment, Booking; payment/booking migrations.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- API integration: VNPAY.

**Database và kiểm soát**

- Success chỉ khi response code và transaction status đều `00`.
- Update payment `status=success`, transaction_code, gateway_response, paid_at; update booking duy nhất `payment_status=paid`. Không update `bookings.status`.
- Transaction retry 3 + lock payment; rollback implicit. Idempotent qua guard non-pending. Không audit history/notification/queue.
- Validation/exception theo BR-030. Authorization: hai callback là route public, không gắn `auth:sanctum` hoặc role middleware; tính xác thực request dựa trên chữ ký VNPAY ở BR-030.
- Data integrity: payment và booking updates trong cùng transaction; booking row không được lock trực tiếp ở nhánh success, nhưng payment row là khóa idempotency của callback.

**Kết luận: Đúng.**

### BR-032 — Payment hết hạn, hủy tại VNPAY và retry lỗi khác

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php` — class `VnpayPaymentController`, method `processVnpayResponse()`; `backend_laravel/app/Services/VnpayPaymentLifecycleService.php` — class `VnpayPaymentLifecycleService`, method `failPendingPayment()`.
- Routes/callers: return/IPN; continue/cancel customer; command expiry.
- Models/Migrations: Payment, Booking, TourDeparture, BookingStatusHistory; migrations payment/booking/departure/history/expiry.
- Service: lifecycle service. Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job: Không sử dụng.
- Command/Scheduler: có ở BR-033. Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- API integration: VNPAY response codes.

**Database và state**

- expires_at past hoặc response `11/24`: payment failed; booking cancelled/payment failed; reason/cancel time; slot trừ sàn 0; insert history.
- Response lỗi khác: chỉ update `payments.gateway_response`, status vẫn pending.
- Lifecycle return ngay nếu payment không pending; sau payment update, return nếu booking đã cancelled; các guard ngăn release lặp.
- Transaction do mọi caller đã truy vết bao quanh; row locks payment/booking/departure; rollback implicit.
- Idempotency: explicit status guards; callback/command lặp không release lần hai.
- Validation/authorization/exception: theo caller; không audit log riêng/notification/queue.
- Data integrity: payment/booking/departure/history được cập nhật dưới transaction và row lock của caller; không có partial commit trong một lần gọi lifecycle.

**Kết luận: Đúng.**

### BR-033 — Scheduler hết hạn VNPAY

**Source Code**

- File/Class/Method: `backend_laravel/app/Console/Commands/ExpirePendingVnpayPayments.php` — `ExpirePendingVnpayPayments::handle()`.
- Scheduler: `backend_laravel/routes/console.php` — `Schedule::command('vnpay:expire-pending-payments')->everyMinute()`.
- HTTP route: Không sử dụng. Command signature: `vnpay:expire-pending-payments`.
- Service: `VnpayPaymentLifecycleService`; Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models/Migrations: Payment, Booking, TourDeparture, BookingStatusHistory; expiry và related migrations.
- Observer/Listener/Event/Policy/Job/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Query payment `vnpay/pending`, expires_at not null và <= now. Với từng ID: transaction retry 3, lock payment, kiểm lại pending/isPast, gọi lifecycle.
- Update/release/history như BR-032. Rollback implicit per payment; một payment exception rollback transaction của payment đó.
- Idempotency: query/guard/lock và lifecycle guard; command lặp bỏ qua payment đã failed.
- Authorization: CLI/scheduler, không phải HTTP role. Validation: điều kiện query + recheck. Audit/notification/queue: Không sử dụng.
- Exception: `handle()` không có try/catch; exception từ một iteration truyền ra ngoài callback/command theo framework.
- Data integrity: mỗi payment có transaction riêng; payment đã xử lý trước một exception ở iteration sau không được rollback theo batch vì không có transaction bao toàn bộ command.

**Kết luận: Đúng.**

### BR-034 — Admin chuyển trạng thái payment

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php` — `confirm()`, `fail()`, `refund()`, `updateStatus()`.
- Routes: `PATCH /api/admin/payments/{id}/confirm`, `/fail`, `/refund`; outer admin group `auth:sanctum`, `role:admin`.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models/Migrations: Payment, Booking; `2026_06_10_220090_create_payments_table.php`; `2026_06_10_220060_create_bookings_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Lock payment; update status success/failed/refunded cùng metadata; nếu có booking, update `bookings.payment_status` paid/failed/refunded.
- Transaction `DB::transaction()`; rollback implicit. Không lock booking row trực tiếp. Không insert status history/audit.
- Không kiểm `payment.status` cũ trong bất kỳ action. Repeated confirm cập nhật `paid_at=now`; source chấp nhận fail/refund sau trạng thái khác.
- Idempotent: không có guard; confirm lặp thay `paid_at`; các action luôn thực hiện update.

**Validation/Authorization/Exception/Data Integrity**

- Confirm: transaction_code sometimes nullable string max100; gateway_response sometimes nullable array. Fail/refund không body validation.
- Admin-only; payment missing trả custom `404`; validation `422`; không try/catch.
- Notification/Queue/Audit: Không sử dụng.
- BR-034 đã nói rõ không kiểm transition, nên mệnh đề BR khớp. Tuy nhiên FR-005 Exception Flow nói “chuyển trạng thái không hợp lệ bị từ chối”; source không có nhánh đó. Đây là BUG-AB-004, không suy ra một ma trận transition mong muốn.

**Kết luận: Đúng.**

## Danh sách BUG đã chứng minh

### BUG-AB-001 — API cho phép bỏ `contact_email` nhưng schema bắt buộc giá trị

- Business Rule/Requirement: BR-021; FR-004; UC-013; API Specification #33.
- Mô tả: Form Request khai báo `contact.contact_email` nullable và controller truyền null khi thiếu; migration khai báo `booking_contacts.contact_email` không nullable.
- File/Hàm:
  - `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php` — `rules()` (`nullable|email|max:255`).
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — `store()` (`$data['contact']['contact_email'] ?? null`).
  - `backend_laravel/database/migrations/2026_06_10_220070_create_booking_contacts_table.php` — `up()` (`string('contact_email', 150)` không `nullable()`).
- Bằng chứng: payload không có email vượt qua rule nullable; create contact nhận null; schema không chấp nhận null. Write nằm trong transaction nên exception DB rollback dữ liệu booking trong closure.
- Mức độ ảnh hưởng: High.
- Điều kiện tái hiện: VNPAY đã cấu hình; customer hợp lệ; tour/departure bookable; gửi booking hợp lệ nhưng bỏ `contact.contact_email`.
- Không đề xuất sửa.

### BUG-AB-002 — Giới hạn chuỗi booking trong validation vượt giới hạn cột

- Business Rule/Requirement: BR-021; FR-004; UC-013; API Specification #33; cùng BUG đã ghi cho auth/profile tại module 01.
- Mô tả: validation cho phép nhiều chuỗi dài hơn schema vật lý.
- File/Hàm/Bằng chứng:
  - `StoreBookingRequest::rules()`: contact_name 255 trong khi migration contact_name 150; contact_email 255 vs 150; contact_phone 30 vs 20; address 500 vs 255; participant full_name 255 vs 150; phone 30 vs 20; identity_number 50 vs 30.
  - Migration: `2026_06_10_220070_create_booking_contacts_table.php::up()` và `2026_06_10_220080_create_booking_participants_table.php::up()`.
- Kết quả DB cụ thể (reject hoặc truncate) phụ thuộc driver/chế độ DB; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** để khẳng định một kết quả runtime duy nhất. Sai lệch giới hạn là trực tiếp và đầy đủ.
- Mức độ ảnh hưởng: Medium.
- Điều kiện tái hiện: gửi từng field với độ dài nằm giữa giới hạn cột+1 và giới hạn validation, giữ mọi dữ liệu khác hợp lệ.
- Không đề xuất sửa.

### BUG-AB-003 — Tổng tiền booking không được đối chiếu với giá tính theo ngày sinh hành khách

- Business Rule/Requirement: BR-024, BR-025; FR-004; UC-013 (“tính giá theo tuổi” và “store ... tính lại giá”).
- Mô tả: controller tính snapshot từng participant từ DOB bằng `calculateParticipantPrice()`, nhưng `booking.total_amount` và `payment.amount` lấy từ subtotal của `quantity_summary`. Không có code so sánh rule/quantity client chọn với rule suy ra từ DOB hoặc so tổng snapshot với subtotal.
- File/Hàm:
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — `store()`, `buildQuantityPricing()`.
  - `backend_laravel/app/Services/TourPricingService.php` — `calculateParticipantPrice()`, `resolveRuleForAge()`.
- Bằng chứng vị trí: `store()` tạo `$pricedParticipants` từ DOB; sau đó `$totalAmount = ... $pricingSummary['subtotal']`; insert participant dùng `$pricedParticipants`, còn booking/payment dùng `$totalAmount`.
- Database bị ghi: `booking_participants.unit_price/pricing_*` theo DOB; `bookings.total_amount` và `payments.amount` theo quantity summary; tất cả commit cùng transaction dù giá trị không được đối chiếu.
- Mức độ ảnh hưởng: Critical (dữ liệu tài chính cốt lõi).
- Điều kiện tái hiện: tạo tour có rule `free` cho tuổi nhỏ và giá adult >0; gửi một participant DOB người lớn nhưng `quantity_summary` chọn rule free với quantity 1. Source chấp nhận rule thuộc tour/active, tính snapshot participant theo DOB nhưng subtotal theo rule free.
- Không đề xuất sửa.

### BUG-AB-004 — FR-005 tuyên bố từ chối transition payment không hợp lệ nhưng source không kiểm transition

- Business Rule/Requirement: BR-034 ghi hiện trạng không kiểm; FR-005 Exception Flow lại ghi “chuyển trạng thái không hợp lệ bị từ chối”; UC-028 xác nhận không có nhánh từ chối state transition.
- Mô tả: ba endpoint admin ghi status đích mà không đọc/validate status hiện tại để quyết định cho phép hay từ chối. Source vì vậy không triển khai mệnh đề từ chối của FR-005.
- File/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php` — `confirm()`, `fail()`, `refund()`, `updateStatus()`.
- Bằng chứng: `updateStatus()` lock payment rồi xây `paymentData` với status đích và update; không có điều kiện trên `$payment->status`. Test `backend_laravel/tests/Feature/PaymentBookingSafetyTest.php` — `admin payment actions synchronize booking payment status` thực hiện tuần tự pending→success→failed→refunded và assert mọi response thành công.
- Mức độ ảnh hưởng: High (state payment/booking cốt lõi).
- Điều kiện tái hiện: admin gọi confirm trên payment pending, sau đó gọi fail và refund trên cùng payment; source chấp nhận cả ba. Tài liệu không xác định transition nào được coi là hợp lệ, vì vậy audit không suy ra ma trận transition.
- Không đề xuất sửa.

## Thành phần không sử dụng/không tìm thấy

- Repository, Action, Use Case class, Domain Service layer riêng, Observer, Listener, Event, Job: Không sử dụng trong BR-021–BR-034.
- Policy/Gate nghiệp vụ: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; authorization dùng Sanctum, role middleware và ownership controller.
- Trigger/Stored Procedure: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Queue/notification trong booking/payment/VNPAY: Không sử dụng.
- Audit log chuyên biệt: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. `booking_status_histories` chỉ được ghi ở create và lifecycle cancel/fail đã nêu.
