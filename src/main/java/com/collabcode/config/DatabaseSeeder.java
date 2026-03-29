package com.collabcode.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.collabcode.model.Problem;
import com.collabcode.repository.ProblemRepository;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private ProblemRepository problemRepository;

    @Override
    public void run(String... args) throws Exception {
        if (problemRepository.count() == 0) {
            problemRepository.save(new Problem(
                "Two Sum",
                "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
                "Easy",
                "def twoSum(nums, target):\n    # Write your code here\n    pass\n\nif __name__ == '__main__':\n    print(twoSum([2, 7, 11, 15], 9))",
                "import java.util.*;\n\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        int[] result = twoSum(new int[]{2, 7, 11, 15}, 9);\n        System.out.println(Arrays.toString(result));\n    }\n}"
            ));

            problemRepository.save(new Problem(
                "Reverse Linked List",
                "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
                "Easy",
                "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseList(head):\n    # Write your code here\n    pass\n\nif __name__ == '__main__':\n    # Test Code\n    print('Reversed')",
                "class ListNode {\n    int val;\n    ListNode next;\n    ListNode(int x) { val = x; }\n}\n\npublic class Main {\n    public static ListNode reverseList(ListNode head) {\n        // Write your code here\n        return head;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(\"Reversed\");\n    }\n}"
            ));

            problemRepository.save(new Problem(
                "Climbing Stairs",
                "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
                "Medium",
                "def climbStairs(n):\n    # Write your code here\n    pass\n\nif __name__ == '__main__':\n    print(climbStairs(5))",
                "public class Main {\n    public static int climbStairs(int n) {\n        // Write your code here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(climbStairs(5));\n    }\n}"
            ));

            problemRepository.save(new Problem(
                "LRU Cache",
                "Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `get(key)`\n- `put(key, value)`",
                "Hard",
                "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        return -1\n\n    def put(self, key, value):\n        pass\n\nif __name__ == '__main__':\n    cache = LRUCache(2)\n    cache.put(1, 1)\n    print(cache.get(1))",
                "import java.util.*;\n\nclass LRUCache {\n    public LRUCache(int capacity) {\n    }\n\n    public int get(int key) {\n        return -1;\n    }\n\n    public void put(int key, int value) {\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        LRUCache cache = new LRUCache(2);\n        cache.put(1, 1);\n        System.out.println(cache.get(1));\n    }\n}"
            ));
        }
    }
}
