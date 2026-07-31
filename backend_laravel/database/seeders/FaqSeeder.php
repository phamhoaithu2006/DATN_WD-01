<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $sortOrder = 10;

        foreach ($this->faqGroups() as $category => $faqs) {
            foreach ($faqs as $faq) {
                Faq::query()->updateOrCreate(
                    [
                        'category' => $category,
                        'question' => $faq['question'],
                    ],
                    [
                        'answer' => $faq['answer'],
                        'keywords' => $faq['keywords'],
                        'sort_order' => $sortOrder,
                        'is_active' => true,
                    ],
                );

                $sortOrder += 10;
            }
        }
    }

    /**
     * @return array<string, list<array{question: string, answer: string, keywords: list<string>}>>
     */
    private function faqGroups(): array
    {
        return [
            Faq::CATEGORY_BOOKING => [
                [
                    'question' => 'Tôi đặt tour trên website như thế nào?',
                    'answer' => 'Bạn chọn tour phù hợp, ngày khởi hành, số lượng khách rồi điền thông tin liên hệ và thông tin hành khách. Hãy kiểm tra lại lịch trình, giá và điều kiện tour trước khi xác nhận đặt chỗ.',
                    'keywords' => ['đặt tour', 'dat tour', 'đăng ký tour', 'dang ky tour', 'đặt chỗ'],
                ],
                [
                    'question' => 'Làm sao biết yêu cầu đặt tour đã được ghi nhận?',
                    'answer' => 'Sau khi gửi yêu cầu thành công, hệ thống sẽ tạo mã đặt tour và hiển thị trạng thái đơn. Bạn nên lưu mã này để tra cứu; nếu chưa thấy xác nhận, hãy kiểm tra lại mục tour đã đặt hoặc liên hệ bộ phận hỗ trợ.',
                    'keywords' => ['xác nhận đặt tour', 'xac nhan dat tour', 'mã đặt tour', 'ma dat tour', 'trạng thái đơn'],
                ],
                [
                    'question' => 'Tôi có thể đặt tour cho người khác không?',
                    'answer' => 'Có. Người đặt cần cung cấp chính xác thông tin liên hệ và thông tin của từng hành khách theo giấy tờ tùy thân. Người đứng tên liên hệ có trách nhiệm tiếp nhận các thông báo liên quan đến đơn đặt tour.',
                    'keywords' => ['đặt hộ', 'dat ho', 'đặt cho người khác', 'thông tin hành khách', 'nguoi lien he'],
                ],
                [
                    'question' => 'Một lần tôi có thể đặt tour cho bao nhiêu người?',
                    'answer' => 'Số khách tối đa phụ thuộc số chỗ còn lại của từng lịch khởi hành và giới hạn hiển thị ở bước đặt tour. Với đoàn đông hoặc khi hệ thống không đủ chỗ, bạn nên liên hệ nhân viên hỗ trợ để được kiểm tra và báo giá đoàn.',
                    'keywords' => ['số lượng khách', 'so luong khach', 'đoàn đông', 'doan dong', 'chỗ còn lại'],
                ],
                [
                    'question' => 'Chọn tour nhưng chưa thanh toán có được giữ chỗ không?',
                    'answer' => 'Việc chỉ chọn tour hoặc nhập thông tin chưa đồng nghĩa chỗ đã được giữ. Tình trạng giữ chỗ phụ thuộc trạng thái đơn và thời hạn thanh toán được hiển thị; quá thời hạn, chỗ có thể được mở lại cho khách khác.',
                    'keywords' => ['giữ chỗ', 'giu cho', 'chưa thanh toán', 'thời hạn thanh toán', 'hết chỗ'],
                ],
            ],
            Faq::CATEGORY_PAYMENT => [
                [
                    'question' => 'Website hỗ trợ những phương thức thanh toán nào?',
                    'answer' => 'Các phương thức đang khả dụng sẽ được hiển thị tại bước thanh toán của từng đơn, chẳng hạn thanh toán trực tuyến hoặc phương thức khác do hệ thống cung cấp. Bạn chỉ nên thanh toán theo hướng dẫn chính thức trên website.',
                    'keywords' => ['thanh toán', 'thanh toan', 'phương thức thanh toán', 'online', 'trực tuyến'],
                ],
                [
                    'question' => 'Tôi phải làm gì khi thanh toán trực tuyến thất bại?',
                    'answer' => 'Bạn hãy kiểm tra số dư, hạn mức, kết nối mạng và trạng thái giao dịch trong tài khoản ngân hàng trước khi thử lại. Không nên thanh toán liên tiếp nếu giao dịch đang chờ xử lý; nếu tiền đã bị trừ nhưng đơn chưa cập nhật, hãy gửi mã đặt tour và mã giao dịch cho bộ phận hỗ trợ.',
                    'keywords' => ['thanh toán thất bại', 'thanh toan that bai', 'giao dịch lỗi', 'trừ tiền', 'giao dich loi'],
                ],
                [
                    'question' => 'Thời hạn thanh toán đơn đặt tour là bao lâu?',
                    'answer' => 'Thời hạn cụ thể phụ thuộc tour và được thông báo trong thông tin đơn hoặc hướng dẫn thanh toán. Bạn nên hoàn tất trước thời hạn; đơn quá hạn có thể bị hủy hoặc không còn đảm bảo số chỗ ban đầu.',
                    'keywords' => ['hạn thanh toán', 'han thanh toan', 'thời hạn', 'đơn quá hạn', 'payment deadline'],
                ],
                [
                    'question' => 'Tôi có thể yêu cầu hóa đơn cho đơn đặt tour không?',
                    'answer' => 'Bạn có thể gửi yêu cầu xuất hóa đơn cùng thông tin chính xác của cá nhân hoặc doanh nghiệp theo hướng dẫn của website. Nên gửi yêu cầu sớm trước khi tour khởi hành vì việc điều chỉnh hóa đơn sau khi phát hành có thể bị giới hạn.',
                    'keywords' => ['hóa đơn', 'hoa don', 'VAT', 'xuất hóa đơn', 'doanh nghiệp'],
                ],
                [
                    'question' => 'Tôi có cần cung cấp mã OTP hoặc mật khẩu ngân hàng cho nhân viên không?',
                    'answer' => 'Không. ViVuGo và nhân viên hỗ trợ không yêu cầu bạn cung cấp mật khẩu, mã OTP, mã PIN hoặc toàn bộ thông tin thẻ. Nếu nhận được yêu cầu đáng ngờ, hãy dừng giao dịch và liên hệ kênh hỗ trợ chính thức trên website.',
                    'keywords' => ['OTP', 'mật khẩu', 'mat khau', 'bảo mật thanh toán', 'lừa đảo'],
                ],
            ],
            Faq::CATEGORY_CANCELLATION_REFUND => [
                [
                    'question' => 'Tôi muốn hủy tour thì thực hiện như thế nào?',
                    'answer' => 'Bạn kiểm tra điều kiện hủy trong chi tiết đơn và gửi yêu cầu hủy qua kênh hỗ trợ chính thức, kèm mã đặt tour. Yêu cầu chỉ được xem là hoàn tất khi trạng thái đơn đã cập nhật hoặc bạn nhận được xác nhận từ ViVuGo.',
                    'keywords' => ['hủy tour', 'huy tour', 'hủy đơn', 'huy don', 'yêu cầu hủy'],
                ],
                [
                    'question' => 'Hủy tour có được hoàn lại toàn bộ tiền không?',
                    'answer' => 'Mức hoàn tiền phụ thuộc điều kiện của tour, thời điểm gửi yêu cầu và các chi phí dịch vụ đã phát sinh. Bạn nên xem chính sách hủy áp dụng cho đơn cụ thể; hủy gần ngày khởi hành thường có mức phí cao hơn.',
                    'keywords' => ['hoàn tiền', 'hoan tien', 'phí hủy', 'phi huy', 'hoàn toàn bộ'],
                ],
                [
                    'question' => 'Bao lâu tôi nhận được tiền hoàn sau khi hủy tour?',
                    'answer' => 'Thời gian xử lý phụ thuộc phương thức thanh toán, thời điểm ViVuGo xác nhận khoản hoàn và quy trình của ngân hàng hoặc cổng thanh toán. Bạn có thể theo dõi trạng thái đơn và liên hệ hỗ trợ nếu đã quá thời gian được thông báo.',
                    'keywords' => ['thời gian hoàn tiền', 'thoi gian hoan tien', 'bao lâu', 'ngân hàng', 'trạng thái hoàn'],
                ],
                [
                    'question' => 'Nếu tour bị hủy từ phía đơn vị tổ chức thì xử lý ra sao?',
                    'answer' => 'ViVuGo sẽ thông báo phương án áp dụng cho đơn của bạn, có thể gồm đổi lịch, đổi tour hoặc hoàn tiền theo điều kiện cụ thể. Bạn nên xác nhận lựa chọn trong thời hạn được thông báo để việc xử lý không bị chậm.',
                    'keywords' => ['tour bị hủy', 'tour bi huy', 'đơn vị tổ chức', 'đổi lịch', 'hoàn tiền'],
                ],
                [
                    'question' => 'Tôi có thể hủy riêng một người trong đơn nhiều khách không?',
                    'answer' => 'Bạn cần liên hệ hỗ trợ càng sớm càng tốt để kiểm tra khả năng tách hoặc giảm số khách. Phí hủy, giá còn lại và chính sách phòng hoặc vé có thể được tính lại theo điều kiện của tour.',
                    'keywords' => ['hủy một người', 'huy mot nguoi', 'giảm số khách', 'đơn nhiều khách', 'tách khách'],
                ],
            ],
            Faq::CATEGORY_BOOKING_CHANGES => [
                [
                    'question' => 'Tôi nhập sai họ tên hành khách thì sửa thế nào?',
                    'answer' => 'Bạn hãy gửi yêu cầu chỉnh sửa ngay khi phát hiện, kèm mã đặt tour và thông tin đúng theo giấy tờ tùy thân. Khả năng sửa và chi phí phát sinh phụ thuộc việc vé, phòng hoặc dịch vụ liên quan đã được xác nhận hay chưa.',
                    'keywords' => ['sai họ tên', 'sai ho ten', 'sửa tên', 'sua ten', 'thông tin hành khách'],
                ],
                [
                    'question' => 'Có thể đổi người đi tour sau khi đã đặt không?',
                    'answer' => 'Việc đổi người phụ thuộc điều kiện của nhà cung cấp và thời điểm yêu cầu. Bạn cần cung cấp thông tin người cũ, người thay thế và giấy tờ cần thiết; một số vé hoặc dịch vụ định danh có thể không cho phép đổi tên hoặc có phí.',
                    'keywords' => ['đổi người', 'doi nguoi', 'thay hành khách', 'đổi tên vé', 'chuyển tour'],
                ],
                [
                    'question' => 'Tôi có thể đổi ngày khởi hành hoặc đổi sang tour khác không?',
                    'answer' => 'Bạn có thể gửi yêu cầu để ViVuGo kiểm tra chỗ trống và điều kiện thay đổi. Chênh lệch giá, phí đổi và chính sách hủy của lịch cũ có thể được áp dụng trước khi xác nhận lịch hoặc tour mới.',
                    'keywords' => ['đổi ngày', 'doi ngay', 'đổi tour', 'doi tour', 'đổi lịch khởi hành'],
                ],
                [
                    'question' => 'Có thể bổ sung thêm người vào đơn đã đặt không?',
                    'answer' => 'Có thể nếu lịch khởi hành vẫn còn chỗ và các dịch vụ liên quan còn khả dụng. Giá cho khách bổ sung được tính tại thời điểm xác nhận và có thể khác mức giá của đơn ban đầu.',
                    'keywords' => ['thêm người', 'them nguoi', 'bổ sung khách', 'thêm hành khách', 'còn chỗ'],
                ],
                [
                    'question' => 'Tôi thay đổi số điện thoại hoặc email liên hệ bằng cách nào?',
                    'answer' => 'Bạn nên cập nhật thông tin tài khoản nếu website hỗ trợ và đồng thời báo bộ phận hỗ trợ để kiểm tra thông tin trên đơn. Hãy bảo đảm số điện thoại và email mới hoạt động để không bỏ lỡ thông báo về thanh toán hoặc khởi hành.',
                    'keywords' => ['đổi số điện thoại', 'doi so dien thoai', 'đổi email', 'thông tin liên hệ', 'cập nhật tài khoản'],
                ],
            ],
            Faq::CATEGORY_DEPARTURES => [
                [
                    'question' => 'Tôi xem các ngày khởi hành còn chỗ ở đâu?',
                    'answer' => 'Các lịch đang mở được hiển thị trong trang chi tiết tour cùng ngày đi, ngày về, giá và số chỗ khả dụng. Số chỗ có thể thay đổi theo thời gian nên bạn nên kiểm tra lại ngay trước khi đặt.',
                    'keywords' => ['lịch khởi hành', 'lich khoi hanh', 'ngày đi', 'còn chỗ', 'departure'],
                ],
                [
                    'question' => 'Khi nào lịch khởi hành được xác nhận chính thức?',
                    'answer' => 'Tình trạng lịch được thể hiện trên chi tiết tour hoặc thông báo của đơn đặt tour. Một số chương trình cần đủ số khách tối thiểu; ViVuGo sẽ thông báo nếu lịch có thay đổi hoặc chưa thể khởi hành như dự kiến.',
                    'keywords' => ['xác nhận khởi hành', 'xac nhan khoi hanh', 'lịch chính thức', 'đủ khách', 'trạng thái lịch'],
                ],
                [
                    'question' => 'Tôi nên có mặt trước giờ khởi hành bao lâu?',
                    'answer' => 'Bạn nên có mặt theo thời gian tập trung ghi trong thông báo hoặc chương trình tour. Với chuyến bay, tàu hoặc hành trình cần làm thủ tục, hãy đến sớm hơn và chuẩn bị đầy đủ giấy tờ để tránh lỡ chuyến.',
                    'keywords' => ['giờ tập trung', 'gio tap trung', 'đến sớm', 'khởi hành', 'lỡ chuyến'],
                ],
                [
                    'question' => 'Nếu giờ khởi hành thay đổi tôi có được thông báo không?',
                    'answer' => 'ViVuGo sẽ gửi thông báo qua thông tin liên hệ gắn với đơn khi nhận được thay đổi quan trọng. Vì vậy bạn cần duy trì số điện thoại và email chính xác, đồng thời kiểm tra thông báo trước ngày đi.',
                    'keywords' => ['đổi giờ', 'doi gio', 'thay đổi lịch', 'thông báo khởi hành', 'trễ chuyến'],
                ],
                [
                    'question' => 'Tour không đủ số khách tối thiểu thì sao?',
                    'answer' => 'Nếu chương trình chưa đủ điều kiện khởi hành, ViVuGo sẽ thông báo các phương án phù hợp như chờ xác nhận thêm, chuyển lịch, đổi tour hoặc xử lý thanh toán theo điều kiện áp dụng. Bạn nên phản hồi lựa chọn trong thời hạn được thông báo.',
                    'keywords' => ['không đủ khách', 'khong du khach', 'số khách tối thiểu', 'dời lịch', 'hủy lịch'],
                ],
            ],
            Faq::CATEGORY_TRANSPORTATION => [
                [
                    'question' => 'Tour sử dụng phương tiện di chuyển nào?',
                    'answer' => 'Phương tiện chính và các chặng di chuyển được nêu trong mô tả hoặc lịch trình của từng tour. Phương tiện có thể được điều chỉnh tương đương vì lý do vận hành nhưng không làm thay đổi các quyền lợi chính đã xác nhận.',
                    'keywords' => ['phương tiện', 'phuong tien', 'xe', 'máy bay', 'tàu'],
                ],
                [
                    'question' => 'Điểm đón và trả khách được thông báo ở đâu?',
                    'answer' => 'Điểm đón, giờ tập trung và thông tin liên hệ thường được ghi trong chương trình hoặc thông báo trước chuyến đi. Bạn cần có mặt đúng điểm và đúng giờ; thay đổi điểm đón cá nhân chỉ được áp dụng khi có xác nhận.',
                    'keywords' => ['điểm đón', 'diem don', 'điểm trả', 'xe đón', 'nơi tập trung'],
                ],
                [
                    'question' => 'Tôi có thể tự di chuyển và nhập đoàn tại điểm đến không?',
                    'answer' => 'Bạn cần hỏi trước để ViVuGo kiểm tra lịch trình và điểm nhập đoàn phù hợp. Nếu được chấp thuận, chi phí phần phương tiện không sử dụng chỉ được điều chỉnh khi điều kiện tour hoặc nhà cung cấp cho phép.',
                    'keywords' => ['tự di chuyển', 'tu di chuyen', 'nhập đoàn', 'không đi xe', 'điểm đến'],
                ],
                [
                    'question' => 'Chỗ ngồi trên xe hoặc máy bay được sắp xếp thế nào?',
                    'answer' => 'Chỗ ngồi phụ thuộc loại phương tiện, quy định của nhà vận chuyển và tình trạng thực tế. Bạn có thể gửi yêu cầu ưu tiên, nhưng vị trí chỉ được bảo đảm khi có xác nhận và có thể phát sinh phí chọn chỗ.',
                    'keywords' => ['chỗ ngồi', 'cho ngoi', 'ghế xe', 'ghế máy bay', 'chọn chỗ'],
                ],
                [
                    'question' => 'Tôi bị say xe hoặc cần hỗ trợ di chuyển đặc biệt thì làm sao?',
                    'answer' => 'Bạn nên báo ngay khi đặt tour về tình trạng say xe, xe lăn hoặc nhu cầu hỗ trợ khác để nhân viên kiểm tra khả năng đáp ứng. Hãy tự chuẩn bị thuốc theo tư vấn y tế cá nhân và không sử dụng thuốc mới nếu chưa có hướng dẫn phù hợp.',
                    'keywords' => ['say xe', 'xe lăn', 'xe lan', 'hỗ trợ di chuyển', 'ghế trước'],
                ],
            ],
            Faq::CATEGORY_ACCOMMODATION_MEALS => [
                [
                    'question' => 'Tiêu chuẩn khách sạn của tour được xác định thế nào?',
                    'answer' => 'Hạng hoặc tiêu chuẩn lưu trú dự kiến được ghi trong chi tiết tour. Tên khách sạn cụ thể có thể được thông báo gần ngày đi và có thể thay bằng cơ sở tương đương khi cần thiết theo điều kiện chương trình.',
                    'keywords' => ['khách sạn', 'khach san', 'tiêu chuẩn phòng', 'hạng sao', 'lưu trú'],
                ],
                [
                    'question' => 'Khách đi một mình có phải trả phụ thu phòng đơn không?',
                    'answer' => 'Nếu không thể ghép phòng hoặc bạn yêu cầu ở riêng, phụ thu phòng đơn có thể được áp dụng theo thông tin của tour. Bạn nên kiểm tra mức phụ thu trước khi xác nhận vì số phòng và giá có thể thay đổi theo ngày đi.',
                    'keywords' => ['phòng đơn', 'phong don', 'phụ thu', 'phu thu', 'đi một mình'],
                ],
                [
                    'question' => 'Tour đã bao gồm những bữa ăn nào?',
                    'answer' => 'Số bữa và hình thức phục vụ được liệt kê trong lịch trình hoặc mục dịch vụ bao gồm. Các bữa tự túc, đồ uống riêng và chi phí ngoài thực đơn sẽ không được tính nếu chương trình không ghi rõ.',
                    'keywords' => ['bữa ăn', 'bua an', 'ăn uống', 'an uong', 'dịch vụ bao gồm'],
                ],
                [
                    'question' => 'Tôi ăn chay hoặc dị ứng thực phẩm thì có được hỗ trợ không?',
                    'answer' => 'Bạn cần thông báo rõ yêu cầu ăn chay hoặc loại thực phẩm gây dị ứng ngay khi đặt tour và nhắc lại với hướng dẫn viên. ViVuGo sẽ chuyển yêu cầu đến đơn vị phục vụ nhưng không thể bảo đảm môi trường hoàn toàn không có nguy cơ nhiễm chéo.',
                    'keywords' => ['ăn chay', 'an chay', 'dị ứng thực phẩm', 'di ung thuc pham', 'thực đơn riêng'],
                ],
                [
                    'question' => 'Tôi có thể nhận phòng sớm hoặc trả phòng muộn không?',
                    'answer' => 'Việc nhận sớm hoặc trả muộn phụ thuộc tình trạng phòng và chính sách của nơi lưu trú, có thể kèm phụ phí. Bạn nên gửi yêu cầu trước; chỉ xem là được chấp thuận khi có xác nhận cụ thể.',
                    'keywords' => ['nhận phòng sớm', 'nhan phong som', 'trả phòng muộn', 'check in', 'check out'],
                ],
            ],
            Faq::CATEGORY_CHILDREN_SENIORS => [
                [
                    'question' => 'Giá tour cho trẻ em được tính theo độ tuổi nào?',
                    'answer' => 'Mốc tuổi và mức giá trẻ em được quy định riêng cho từng tour và có thể phụ thuộc ngày sinh tại thời điểm khởi hành. Bạn cần nhập đúng ngày sinh và mang giấy tờ chứng minh độ tuổi để tránh phát sinh chênh lệch chi phí.',
                    'keywords' => ['giá trẻ em', 'gia tre em', 'độ tuổi', 'vé trẻ em', 'ngày sinh'],
                ],
                [
                    'question' => 'Trẻ sơ sinh có cần đăng ký trong đơn đặt tour không?',
                    'answer' => 'Có. Mọi hành khách, kể cả trẻ sơ sinh, đều cần được khai báo để sắp xếp bảo hiểm, phương tiện và dịch vụ phù hợp. Một số chặng bay hoặc cơ sở lưu trú vẫn có phí dành cho trẻ sơ sinh.',
                    'keywords' => ['trẻ sơ sinh', 'tre so sinh', 'em bé', 'em be', 'đăng ký trẻ em'],
                ],
                [
                    'question' => 'Người cao tuổi có thể tham gia tour không?',
                    'answer' => 'Người cao tuổi có thể tham gia nếu sức khỏe phù hợp với cường độ và điều kiện của hành trình. Gia đình nên đọc kỹ lịch trình, khai báo nhu cầu hỗ trợ và tham khảo ý kiến bác sĩ đối với người có bệnh nền hoặc tour vận động nhiều.',
                    'keywords' => ['người cao tuổi', 'nguoi cao tuoi', 'sức khỏe', 'bệnh nền', 'tour người già'],
                ],
                [
                    'question' => 'Phụ nữ mang thai có được đi tour không?',
                    'answer' => 'Khả năng tham gia phụ thuộc tuần thai, tình trạng sức khỏe, lịch trình và quy định của hãng vận chuyển. Bạn cần thông báo trước, mang giấy xác nhận y tế khi được yêu cầu và không nên chọn hành trình có rủi ro hoặc vận động quá sức.',
                    'keywords' => ['mang thai', 'bà bầu', 'ba bau', 'giấy xác nhận y tế', 'thai kỳ'],
                ],
                [
                    'question' => 'Trẻ em có thể đi tour mà không có cha mẹ không?',
                    'answer' => 'Trẻ cần đi cùng người lớn chịu trách nhiệm và có giấy tờ đồng ý hoặc ủy quyền nếu quy định của hành trình yêu cầu. Một số tour, hãng vận chuyển hoặc điểm đến có điều kiện riêng đối với trẻ không đi cùng cha mẹ.',
                    'keywords' => ['trẻ đi một mình', 'tre di mot minh', 'không có cha mẹ', 'ủy quyền', 'người giám hộ'],
                ],
            ],
            Faq::CATEGORY_DOCUMENTS_LUGGAGE => [
                [
                    'question' => 'Đi tour trong nước cần mang giấy tờ gì?',
                    'answer' => 'Bạn cần mang giấy tờ tùy thân bản gốc còn giá trị và phù hợp với độ tuổi, như căn cước hoặc giấy khai sinh đối với trẻ em theo quy định. Nếu hành trình có chuyến bay hoặc tàu, thông tin trên giấy tờ phải trùng với thông tin đặt dịch vụ.',
                    'keywords' => ['giấy tờ trong nước', 'giay to trong nuoc', 'căn cước', 'giấy khai sinh', 'CCCD'],
                ],
                [
                    'question' => 'Đi tour nước ngoài cần hộ chiếu và visa như thế nào?',
                    'answer' => 'Bạn cần hộ chiếu còn hạn theo yêu cầu của điểm đến và visa hoặc giấy phép nhập cảnh nếu quốc gia đó quy định. Hãy kiểm tra kỹ thời hạn, số trang trống và cung cấp hồ sơ đúng thời gian; việc cấp visa do cơ quan có thẩm quyền quyết định.',
                    'keywords' => ['hộ chiếu', 'ho chieu', 'visa', 'tour nước ngoài', 'nhập cảnh'],
                ],
                [
                    'question' => 'Hành lý được mang theo tour có giới hạn không?',
                    'answer' => 'Giới hạn hành lý phụ thuộc hãng vận chuyển và loại vé sử dụng trong tour. Bạn nên xem thông tin dịch vụ trước chuyến đi, cân hành lý và mua thêm hạn mức sớm nếu cần để tránh phí cao tại sân bay hoặc điểm khởi hành.',
                    'keywords' => ['hành lý', 'hanh ly', 'ký gửi', 'xách tay', 'quá cân'],
                ],
                [
                    'question' => 'Nếu mất giấy tờ trong chuyến đi tôi phải làm gì?',
                    'answer' => 'Bạn cần báo ngay cho hướng dẫn viên hoặc đầu mối hỗ trợ, đồng thời liên hệ cơ quan chức năng gần nhất để lập xác nhận theo quy định. Với chuyến quốc tế, có thể cần liên hệ cơ quan đại diện Việt Nam để được hướng dẫn giấy tờ thay thế.',
                    'keywords' => ['mất giấy tờ', 'mat giay to', 'mất hộ chiếu', 'đại sứ quán', 'hướng dẫn viên'],
                ],
                [
                    'question' => 'Những vật dụng nào không nên để trong hành lý?',
                    'answer' => 'Bạn không nên mang vật phẩm bị pháp luật hoặc nhà vận chuyển cấm, và không để giấy tờ, tiền, thuốc thiết yếu hay đồ giá trị trong hành lý ký gửi. Pin dự phòng, chất lỏng và vật sắc nhọn phải tuân theo quy định của từng phương tiện.',
                    'keywords' => ['hành lý cấm', 'hanh ly cam', 'pin dự phòng', 'chất lỏng', 'vật sắc nhọn'],
                ],
            ],
            Faq::CATEGORY_CUSTOMER_SUPPORT => [
                [
                    'question' => 'Tôi có thể liên hệ nhân viên hỗ trợ bằng cách nào?',
                    'answer' => 'Bạn có thể chọn “Gặp nhân viên hỗ trợ” trong menu chatbot hoặc sử dụng các kênh liên hệ chính thức được hiển thị trên website. Khi liên hệ về một đơn cụ thể, hãy chuẩn bị mã đặt tour để được kiểm tra nhanh hơn.',
                    'keywords' => ['nhân viên hỗ trợ', 'nhan vien ho tro', 'liên hệ', 'chatbot', 'hotline'],
                ],
                [
                    'question' => 'Thời gian làm việc của bộ phận hỗ trợ là khi nào?',
                    'answer' => 'Khung giờ phục vụ hiện hành được công bố tại khu vực thông tin liên hệ của website. Ngoài giờ làm việc, bạn vẫn có thể gửi nội dung và thông tin đơn; yêu cầu sẽ được xử lý khi nhân viên tiếp nhận trở lại.',
                    'keywords' => ['giờ làm việc', 'gio lam viec', 'thời gian hỗ trợ', 'ngoài giờ', 'support'],
                ],
                [
                    'question' => 'Tôi cần hỗ trợ khẩn cấp khi đang đi tour thì liên hệ ai?',
                    'answer' => 'Bạn nên liên hệ ngay hướng dẫn viên, trưởng đoàn hoặc số hỗ trợ khẩn cấp được cung cấp trong thông báo trước chuyến đi. Nếu có nguy cơ về sức khỏe hoặc an toàn, hãy ưu tiên gọi cơ quan khẩn cấp tại địa phương.',
                    'keywords' => ['khẩn cấp', 'khan cap', 'đang đi tour', 'hướng dẫn viên', 'trưởng đoàn'],
                ],
                [
                    'question' => 'Khi gửi khiếu nại tôi cần cung cấp thông tin gì?',
                    'answer' => 'Bạn nên cung cấp mã đặt tour, nội dung sự việc, thời gian, địa điểm và hình ảnh hoặc chứng từ liên quan nếu có. Thông tin đầy đủ giúp ViVuGo đối chiếu với các bên cung cấp dịch vụ và phản hồi chính xác hơn.',
                    'keywords' => ['khiếu nại', 'khieu nai', 'phản ánh', 'mã đặt tour', 'chứng từ'],
                ],
                [
                    'question' => 'Tôi nên bảo vệ thông tin cá nhân khi yêu cầu hỗ trợ như thế nào?',
                    'answer' => 'Chỉ gửi thông tin cần thiết qua kênh chính thức và che bớt dữ liệu nhạy cảm trên ảnh giấy tờ khi không cần dùng đến. Không cung cấp mật khẩu, OTP, mã PIN hoặc thông tin đăng nhập cho bất kỳ nhân viên nào.',
                    'keywords' => ['bảo mật', 'bao mat', 'thông tin cá nhân', 'dữ liệu cá nhân', 'OTP'],
                ],
            ],
        ];
    }
}
