# Test Case bổ sung — Yêu cầu xuyên tài liệu SR-001–SR-013

## Quy ước

- Đây là thiết kế test từ business model và source đã audit, không phải báo cáo một lần chạy test mới.
- Mọi case có `Hiện trạng tự động hóa`. Chỉ ghi đã có khi test tracked chứa assertion trực tiếp đúng mục tiêu.
- Dữ liệu actor dùng đúng role `customer`, `admin`, `tour guide`, `support staff`; route có prefix `/api`.
- Case concurrency/idempotency chỉ đặt invariant đã có bằng chứng từ code hoặc migration; phần không được source bảo đảm được ghi thành mục tiêu quan sát, không biến thành cam kết.

## SR-001 — Public tour list/search/filter/detail

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-001 | SR-001 | Danh sách public / Positive | Có tour published và departure open tương lai | GET `/api/tours` không token | 200; paginator `TourResource`; chỉ tour published | `Customer/TourController::{index_gdkh,customerTourQuery}` | Hiện trạng tự động hóa: `RbacAuthorizationTest.php`, test `public routes remain public`, assertion `GET /api/tours -> assertOk()`; phần assertion dữ liệu lọc: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-002 | SR-001 | Keyword/category/destination/duration / Positive | Có các tour đối chứng | GET `/api/tours` với từng filter và tổ hợp | Chỉ tour khớp title/summary/description/category/destination/duration | `applyTourFilters()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-003 | SR-001 | Ngày, số khách và giá phải khớp cùng departure / Business rule | Một tour có hai departure, mỗi departure chỉ khớp một phần điều kiện | GET filter chứa date+guests+price | Tour bị loại nếu không có một departure duy nhất thỏa toàn bộ | `hasDepartureFilters()`, `applyDepartureConditions()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-004 | SR-001 | Sort allowlist / Positive | Có tour chênh giá/ngày/rating/duration | Gọi lần lượt các sort hợp lệ | Thứ tự đúng `latest`, giá, departure, rating, duration | `applySort()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-005 | SR-001 | Validation filter / Negative, boundary | — | `per_page=0,1,50,51`; giá âm; guest 0; sort lạ | 1/50 qua validation; 0/51 và input sai trả 422 | `validateFilters()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-006 | SR-001 | Detail published và not-found / Positive, negative | Có một published và một draft slug | GET `/api/tours/{slug}` từng slug/slug lạ | Published trả 200 resource; draft/lạ trả 404 | `show_gdkh()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-007 | SR-001 | GET không ghi dữ liệu / Idempotency | Snapshot các bảng catalog | Gọi cùng list/detail hai lần | Response logic tương đương; không có insert/update/delete | Các action chỉ query/resource | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-002 — Current session

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-008 | SR-002 | `/auth/me` trả current user / Positive | Admin có token | GET `/api/auth/me` | 200; đúng `user.id`, `user.role.name` | closure `routes/api.php` | Hiện trạng tự động hóa: `RbacAuthorizationTest.php`, test `auth me returns the authenticated user with role`; assertions `assertOk`, `user.id`, `user.role.name` |
| TC-XD-009 | SR-002 | `/auth/me` dùng cho mọi role / Authorization matrix | Token của bốn role | Gọi endpoint với từng token | Mỗi role 200 và trả chính user đó | `auth:sanctum`, không role middleware | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-010 | SR-002 | `/user` customer-only / Authorization | Guest, admin, customer | GET `/api/user` | Lần lượt 401, 403, 200 | customer route group; `AuthController::me()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-011 | SR-002 | Hai response envelope / Contract | Customer token | GET `/auth/me`, rồi `/user` | `/auth/me` có `user`; `/user` có `success`, `user`, `data`; ID thống nhất | closure; `AuthController::me()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-003 — Customer summary

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-012 | SR-003 | Count booking/wishlist current customer / Positive | Customer A có 2 booking, 3 wishlist; B có dữ liệu khác | A GET `/api/profile/summary` | 200; thông tin A; count 2 và 3, không cộng dữ liệu B | `CustomerDashboardController::summary()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-013 | SR-003 | Count rỗng / Boundary | Customer không có booking/wishlist | GET summary | Hai count bằng 0 | `User::{bookings,wishlists}` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-014 | SR-003 | Role guard / Authorization | Guest, guide, customer | GET summary | 401, 403, 200 | customer middleware group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-004 — Wishlist

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-015 | SR-004 | Thêm và list wishlist / Positive | Customer, tour tồn tại | POST `{tour_id}` rồi GET wishlist | POST 200; GET chứa tour và paginator 10 | `WishlistController::{store,index}` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-016 | SR-004 | Tour ID thiếu/sai / Negative | Customer | POST thiếu ID rồi ID không tồn tại | 422; không insert pivot | `store()` validation | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-017 | SR-004 | Add lặp / Idempotency | Customer/tour | POST cùng ID hai lần | Hai lần không tạo hơn một row `(user_id,tour_id)` | `syncWithoutDetaching`; unique migration | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-018 | SR-004 | Add đồng thời / Concurrency | Hai request cùng customer/tour | Gửi đồng thời hai POST | [Suy luận từ source code] Sau cùng đúng một pivot nhờ unique; ghi nhận HTTP của request tranh chấp vì controller không catch unique exception | unique `(user_id,tour_id)` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-019 | SR-004 | Remove chỉ current user / Authorization ownership | A và B đều wishlist cùng tour | A DELETE tour; kiểm DB | Pivot A bị xóa; pivot B còn nguyên | `destroy()` gọi relation của current user | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-020 | SR-004 | Remove lặp / Idempotency | Pivot đã bị xóa | DELETE lại cùng tour | 200 message; DB vẫn không có pivot của user | `detach()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-021 | SR-004 | Middleware / Authorization | Guest, admin, customer | Gọi GET/POST/DELETE | Guest 401; admin 403; customer đi tiếp | route customer group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-005 — Admin self-profile

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-022 | SR-005 | Xem hồ sơ / Positive | Admin token | GET `/api/admin/profile` | 200 và đúng current user | `AdminProfileController::show()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-023 | SR-005 | Update text fields / Positive | Admin | PUT name/email/phone/avatar_url | 200; DB current user đổi đúng field | `update()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-024 | SR-005 | Email unique/length / Negative, boundary | Có user email khác | PUT email trùng; name/email 150/151; avatar_url 500/501 | Boundary theo validation; input vượt/trùng trả 422 | `update()` validation | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-025 | SR-005 | Đổi mật khẩu / Positive, negative | Admin biết password hiện tại | PUT password đúng rồi thử current sai | Lần đúng 200/hash đổi; current sai 422/không đổi | `changePassword()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-026 | SR-005 | Role guard / Authorization | Guest, customer, admin | Gọi ba endpoint | 401, 403, admin đi tiếp | admin middleware group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-027 | SR-005 | Avatar file theo UC-019 / BUG-XD-003 | Admin; file JPG hợp lệ | Multipart PUT với field `avatar` | Source không validate/lưu file; avatar DB/storage không đổi, chứng minh mismatch UC | `AdminProfileController::update()` chỉ có `avatar_url` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-006 — Guide self-profile

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-028 | SR-006 | Show relation / Positive | Guide có profile/languages/experiences | GET `/api/guide/profile` | 200, đúng guide/user/language level/certificate | `GuideProfileController::show()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-029 | SR-006 | Update user/guide/pivot / Positive | Guide token, reference tồn tại | PUT user fields, experience, status, languages, certificates | 200; DB user/guide/pivot/experience đồng bộ | `update()` transaction | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-030 | SR-006 | `certificate_type` / BUG-XD-002 | Guide có giá trị cũ | PUT `certificate_type` mới | API trả success nhưng DB vẫn giá trị cũ do field thiếu trong `$fillable` | `GuideProfileController::update`; `Guide::$fillable` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-031 | SR-006 | Validation relation / Negative | Guide | language/certificate không tồn tại; experience -1/41; status lạ | 422; transaction không ghi | `update()` validation | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-032 | SR-006 | Avatar validation / Boundary | Guide | File MIME sai; file >5120 KB; file hợp lệ | Sai trả 422; hợp lệ lưu avatar URL | `update()` avatar rules/storage | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-033 | SR-006 | DB lỗi sau upload / Rollback, compensation | Giả lập exception trong transaction sau khi file mới lưu | PUT có avatar + dữ liệu | DB rollback; file avatar mới bị xóa; 500 | catch/`Storage::delete`; `DB::transaction` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-034 | SR-006 | Password branches / Positive, negative | Guide | old đúng/new confirmed; old sai; new trùng old | 200; 400; 400 tương ứng | `changePassword()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-035 | SR-006 | Missing profile và wrong role / Authorization | Guide user không profile; customer | Guide GET/PUT; customer GET | Guide nhận 404; customer nhận 403 | `show/update`; role middleware | Hiện trạng tự động hóa: `RbacAuthorizationTest.php`, test `non-guide users cannot access guide APIs`, assertion customer GET `/api/guide/profile` `assertForbidden()`; phạm vi missing-profile: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-007 — Support self-profile

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-036 | SR-007 | Show profile / Positive | Support có profile | GET `/api/support/profile` | 200, user + role + support profile | `SupportProfileController::show()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-037 | SR-007 | Đồng bộ profile / Positive | Support profile tồn tại | PUT name/email/status/phone | `users` và `support_staff` đồng bộ name/email/status; phone ở user | `update()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-038 | SR-007 | Missing profile / Negative | Support user không support_staff | PUT profile | 404; user không đổi | `update()` guard | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-039 | SR-007 | Password branches / Positive, negative | Support | old đúng; old sai; new trùng old | 200; 422; 422 | `changePassword()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-040 | SR-007 | Role guard / Authorization | Guest, customer, support | Gọi profile/password | 401, 403, support đi tiếp | support route group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-041 | SR-007 | Lỗi save support sau update user / Data integrity | Giả lập exception ở `$supportStaff->save()` | PUT field đồng bộ | [Suy luận từ source code] Xác minh user đã đổi nhưng support profile chưa đổi vì không có transaction; ghi nhận partial update | `update()` thứ tự hai lệnh save | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-008 — Guide dashboard

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-042 | SR-008 | Dashboard aggregate / Positive | Guide có assignment, booking paid/non-paid, review visible/hidden | GET `/api/guide/dashboard` | Chỉ assignment không cancelled, booking paid/non-cancelled và review visible tham gia tập tương ứng | `GuideDashboardController::show()` + helper | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-043 | SR-008 | Missing profile / Alternative | Guide-role user không profile | GET dashboard | 200; `guide.id=null`, count 0, collection rỗng | `show()` early return | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-044 | SR-008 | Notification count hardcoded / Source contract | Guide có notification unread | GET dashboard | `summary.notifications_count=0` theo source, không dùng DB notification | `show()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-045 | SR-008 | Count bị giới hạn / Boundary evidence | >5 upcoming, >5 ongoing, >6 today | GET dashboard | Ghi nhận `upcoming_count/ongoing_count<=5`, `today_count<=6` theo collection đã limit | `show()` query + `count()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-046 | SR-008 | Status departure trong tập date-based / Data integrity evidence | Assignment active tới departure cancelled tương lai và completed còn trong date range | GET dashboard | Ghi nhận record vẫn vào upcoming/ongoing theo query hiện tại; overview phân nhóm riêng | `departureBaseQuery()`, `buildTourOverview()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-047 | SR-008 | Middleware / Authorization | Guest, customer, guide | GET dashboard | 401, 403, 200 | guide route group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-009 — Booked customers theo departure

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-048 | SR-009 | List booking đúng departure / Positive | Hai departure có booking/contact/participants | Admin GET endpoint departure A | Chỉ booking A; payload departure, customer/contact/participants/pricing | `AdminTourDepartureBookingController::index()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-049 | SR-009 | Search các nguồn / Positive | Booking code, user và contact khác nhau | Search lần lượt từng giá trị | Match theo booking code/user full_name-email-phone/contact | `index()` search closure | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-050 | SR-009 | Filter status/payment / Positive | Nhiều tổ hợp status | GET với từng filter/kết hợp | Chỉ booking exact match | `index()` `when` filters | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-051 | SR-009 | `per_page` boundary / Boundary | >100 booking | per_page 1,100,0,101 | 1/100 qua; 0/101 trả 422 | validation `per_page` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-052 | SR-009 | Binding và role / Authorization | Departure lạ; guest/customer/admin | Gọi endpoint | 404 cho ID lạ; guest 401; customer 403; admin 200 | route binding/admin group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-053 | SR-009 | GET idempotency | Snapshot bảng booking/departure | Gọi cùng query hai lần | Không mutation; dữ liệu nghiệp vụ không đổi | action chỉ read | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-010 — Route throttle

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-054 | SR-010 | Login 6/phút / Boundary | Cùng limiter key | 7 request login body rỗng | 6 lần 422; lần 7 là 429 | `routes/api.php` login throttle | Hiện trạng tự động hóa: `ApiRateLimitTest.php`, test `login endpoint limits repeated requests`, assertions 422×6 và 429 |
| TC-XD-055 | SR-010 | Register 5/phút / Boundary | Cùng limiter key | 6 request invalid | 5 request qua middleware tới validation; request 6 trả 429 | register `throttle:5,1` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-056 | SR-010 | Forgot password 5/phút / Boundary | Cùng limiter key | 6 request | Request 6 trả 429 | forgot `throttle:5,1` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-057 | SR-010 | Chatbot 20/phút / Boundary | Cùng limiter key | 21 request | Request 21 trả 429 | chatbot `throttle:20,1` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-058 | SR-010 | Tour review 10/phút từng route / Boundary | Customer token | 11 POST; cửa sổ riêng kiểm 11 PUT | Request 11 của từng route trả 429 | review routes `throttle:10,1` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-059 | SR-010 | VNPAY return/IPN 60/phút / Boundary | Cùng limiter key | 61 request mỗi endpoint | Request 61 trả 429 | VNPAY routes `throttle:60,1` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-060 | SR-010 | Travel assistant không throttle riêng / Contract | Cùng client | >20 request hợp lệ/invalid | Không nhận 429 từ middleware route riêng; response theo controller/upstream | route `/travel-assistant` không middleware throttle | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-061 | SR-010 | Cửa sổ limiter độc lập / Isolation | Hai client/IP hoặc key limiter khác | Gửi dưới/vượt ngưỡng từng client | Một client bị 429 không tự động chặn client khác theo Laravel limiter key | route throttle middleware/framework | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-011 — Assigned tour list/detail

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-062 | SR-011 | All list status/actions / Positive | Guide có ongoing/upcoming/completed | GET `/api/guide/tours` | 200; status và action policy đúng | `GuideTourController::index/decorateDeparture` | Hiện trạng tự động hóa: `GuideTourAttendanceApiTest.php`, test `guide tour list exposes status aware actions`; assertions ID/status/action cho cả ba nhóm |
| TC-XD-063 | SR-011 | Endpoint nhóm thời gian / Positive | Như trên, thêm cancelled | GET upcoming/ongoing/completed | Mỗi record vào đúng query; ongoing loại completed/cancelled | `upcoming()`, `ongoing()`, `completed()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-064 | SR-011 | Assignment cancelled bị loại / Negative | Guide có assignment cancelled | GET list/detail | Không có trong list; detail 404 | `baseQuery()`, `show()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-065 | SR-011 | Detail ownership / Authorization | Departure được giao cho guide A, guide B đăng nhập | B GET detail | 404; không lộ detail A | `show()` query `tga.guide_id` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-066 | SR-011 | Filters/sort / Positive | Nhiều tour/destination/date | Query keyword/destination/from/to/newest/oldest | Paginator chỉ chứa match và đúng thứ tự | `applyFilters()`, `sortForGuide()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-067 | SR-011 | `per_page` edge / Boundary | >50 assignment | per_page 50,51,0,-1 | 50/51 cap 50; ghi nhận hành vi 0/-1 theo paginator vì helper không đặt min/validation | `paginatedResponse()`, `emptyPaginator()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-068 | SR-011 | Missing profile / Alternative | Guide-role user không profile | Gọi list và detail | List 200 empty paginator; detail 200 `data:null` | early return các action | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-069 | SR-011 | Role guard / Authorization | Guest, customer, guide | GET list | 401, 403, 200 | guide middleware group | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-012 — Customer VNPAY payment status

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-070 | SR-012 | Owner đọc status / Positive | Customer có booking/payment VNPAY | GET payment | 200; đúng payment ID/status và booking payload | `VnpayPaymentController::status()` | Hiện trạng tự động hóa: `PaymentBookingSafetyTest.php`, test `customer can only see status of their own VNPAY payment`; assert 200, ID, pending |
| TC-XD-071 | SR-012 | Customer khác / Ownership negative | Payment của A; B đăng nhập | B GET payment | 404 | `status()` owner check | Hiện trạng tự động hóa: Cùng test trên, assertion customer khác `assertNotFound()` |
| TC-XD-072 | SR-012 | Payment không phải VNPAY / Negative | Owner có COD/Momo payment | GET endpoint với payment đó | 404 | `payment_method !== vnpay` guard | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-073 | SR-012 | Guest/wrong role/binding / Authorization | Guest, admin, customer; ID không số/không tồn tại | Gọi endpoint | Guest 401; admin 403; invalid/missing payment 404 | route middleware/binding/whereNumber | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## SR-013 — Notification feed/read-state theo role

| ID | SR | Mục tiêu / Loại | Tiền điều kiện | Dữ liệu và bước | Kết quả mong đợi | Source Code Reference | Hiện trạng tự động hóa |
|---|---|---|---|---|---|---|---|
| TC-XD-074 | SR-013 | Admin list/count own notification / Positive | Hai admin có unread/read notification | Admin A GET list/count | Chỉ dữ liệu A; count chỉ unread + read_at null theo source | `AdminNotificationBellController::{index,unreadCount}` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-075 | SR-013 | Admin read one ownership / Positive, negative | Notification của A và B | A PATCH own rồi ID của B | Own thành read/200; của B trả 404 | `markAsRead()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-076 | SR-013 | Admin read all scoped / Positive | A/B đều có nhiều unread | A PATCH `/read-all` | Mọi notification A thành read; B không đổi | `markAllAsRead()` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-077 | SR-013 | Support list/count/detail/read / Positive | Support A có unread/read | Gọi bốn endpoint support | Chỉ data A; detail unread tự mark read; PATCH mark read trả record mới | `SupportNotificationController` read methods | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-078 | SR-013 | Support ownership / Negative | Notification của support B | A GET detail/PATCH ID B | 404; B record không đổi | support query `user_id=current` | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-079 | SR-013 | Read lặp và đồng thời / Idempotency, concurrency | Một unread notification | Hai PATCH read-one đồng thời, rồi gọi lại | [Suy luận từ source code] Final status read; không insert/delete/duplicate; `read_at` theo lần update cuối | admin/support read update | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| TC-XD-080 | SR-013 | Role matrix / Authorization | Guest, customer, guide, đúng role | Gọi admin bell và support inbox | Chỉ admin vào bell; chỉ support vào inbox; guest 401, role khác 403 | route groups | Hiện trạng tự động hóa: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |

## Traceability

| SR | Test case |
|---|---|
| SR-001 | TC-XD-001–TC-XD-007 |
| SR-002 | TC-XD-008–TC-XD-011 |
| SR-003 | TC-XD-012–TC-XD-014 |
| SR-004 | TC-XD-015–TC-XD-021 |
| SR-005 | TC-XD-022–TC-XD-027 |
| SR-006 | TC-XD-028–TC-XD-035 |
| SR-007 | TC-XD-036–TC-XD-041 |
| SR-008 | TC-XD-042–TC-XD-047 |
| SR-009 | TC-XD-048–TC-XD-053 |
| SR-010 | TC-XD-054–TC-XD-061 |
| SR-011 | TC-XD-062–TC-XD-069 |
| SR-012 | TC-XD-070–TC-XD-073 |
| SR-013 | TC-XD-074–TC-XD-080 |

Tổng cộng: **80 test case bổ sung**, bao phủ đủ 13 SR.
